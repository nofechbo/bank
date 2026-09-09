import type { ServiceResult } from "../types/service.types.js";
import OpenAI from "openai";
import {
  MAX_OUTPUT_TOKENS,
  OUT_OF_SCOPE_REPLY,
  SAFE_REPLY_FALLBACK,
  SYSTEM_INSTRUCTIONS,
  TUNA_MASCOT_REPLY,
  UNSAFE_REPLY_PATTERN,
} from "../utils/chatUtils/chat.consts.js";
import { ChatLimitError, reserveChatRequest, reserveChatModelCall } from "../services/chatRateLimit.service.js";
import { randomUUID } from "node:crypto";
import {
  chatLog,
  conversationInput,
  isSupportScope,
  isTunaMascotQuestion,
  validateChatRequest,
} from "../utils/chatUtils/chat.helpers.js";
import { logError } from "../utils/logger.js";
import type { OpenAIErrorDetails } from "../types/chat.types.js";

const PROVIDER = process.env.OPENROUTER_API_KEY ? "openrouter" : "openai";
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

export const chatService = async (body: any, ip: string | undefined): Promise<ServiceResult> => {
  const headers: Record<string, string | number> = {};
  const chatRequestId = randomUUID();
  const startedAt = Date.now();
  const message =
    typeof body?.message === "string" ? body.message.trim() : "";
  const validation = validateChatRequest(message, body?.history);

  chatLog("request_received", {
    chatRequestId,
    messageLength: message.length,
    historyMessages: validation.valid ? validation.history.length : null,
  });

  if (!validation.valid) {
    chatLog("request_rejected", {
      chatRequestId,
      reason: validation.reason,
    });
    return { status: 400, body: { error: validation.error }, headers };
  }
  const { history } = validation;

  try {
    await reserveChatRequest(ip || "unknown");
  } catch (error) {
    if (error instanceof ChatLimitError) {
      headers["Retry-After"] = error.retryAfter;
      return { status: 429, body: { error: error.message }, headers };
    }
    logError("chat_quota_unavailable", error);
    return { status: 503, body: { error: "Support chat is currently unavailable." }, headers };
  }

  //check for mascot question or out of scope question to not consume model usage
  if (isTunaMascotQuestion(message)) {
    chatLog("mascot_reply", { chatRequestId });
    return { status: 200, body: { reply: TUNA_MASCOT_REPLY }, headers };
  }
  if (!isSupportScope(message)) {
    chatLog("out_of_scope_reply", { chatRequestId });
    return { status: 200, body: { reply: OUT_OF_SCOPE_REPLY }, headers };
  }

  const model = PROVIDER === "openrouter"
    ? process.env.OPENROUTER_CHAT_MODEL || "openrouter/free"
    : process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
  if (!API_KEY) {
    chatLog("request_rejected", {
      chatRequestId,
      reason: "missing_llm_api_key",
    });
    return { status: 503, body: { error: "Support chat is not configured yet." }, headers };
  }

  try {
    chatLog("rate_limit_passed", { chatRequestId, provider: PROVIDER });

    const client = new OpenAI({
      apiKey: API_KEY,
      maxRetries: 0,
      timeout: 30_000,
      ...(PROVIDER === "openrouter" ? {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_BASE_URL || "http://localhost:5173",
        "X-Title": "TunaBank Learning Project",
      },
      } : {}),
    });

    // OpenRouter's free router does not offer OpenAI's Moderations endpoint.
    if (PROVIDER === "openai") {
      await reserveChatModelCall();
      const moderation = await client.moderations.create(
        { model: "omni-moderation-latest", input: message },
        { headers: { "X-Client-Request-Id": chatRequestId } },
      );
      chatLog("moderation_completed", { chatRequestId, provider: PROVIDER, flagged: moderation.results[0]?.flagged ?? false });
      if (moderation.results[0]?.flagged) {
        return { status: 400, body: { error: "I can’t help with that request. Please keep the chat focused on account support." }, headers };
      }
    } else {
      chatLog("moderation_bypassed", { chatRequestId, provider: PROVIDER, reason: "endpoint_unavailable" });
    }

    await reserveChatModelCall();
    const response = await client.responses.create(
      {
        model,
        instructions: SYSTEM_INSTRUCTIONS,
        input: conversationInput(history, message),
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
      },
      { headers: { "X-Client-Request-Id": chatRequestId } },
    );

    const reply = response.output_text.trim();
    if (!reply) throw new Error("The model returned no text");

    chatLog("response_completed", {
      chatRequestId,
      provider: PROVIDER,
      providerRequestId:
        (response as typeof response & { _request_id?: string | null })
          ._request_id ?? null,
      providerResponseId: response.id,
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      totalTokens: response.usage?.total_tokens ?? null,
      responseStatus: response.status,
      incompleteReason: response.incomplete_details?.reason ?? null,
      durationMs: Date.now() - startedAt,
    });

    // Free routed models can occasionally emit their scratch work. Do not
    // expose it to customers, even if it repeats server-side instructions.
    if (UNSAFE_REPLY_PATTERN.test(reply)) {
      chatLog("unsafe_model_output_discarded", {
        chatRequestId,
        provider: PROVIDER,
        providerResponseId: response.id,
        model: response.model,
      });
      return { status: 200, body: { reply: SAFE_REPLY_FALLBACK }, headers };
    }

    return { status: 200, body: { reply }, headers };
  } catch (error) {
    const details = error as OpenAIErrorDetails;
    logError("support_chat_request_failed", details, {
      service: "support-chat",
      chatRequestId,
      provider: PROVIDER,
      status: details.status ?? null,
      errorCode: details.code ?? null,
      errorType: details.type ?? details.name,
      providerRequestId:
        details.requestID ?? details.request_id ?? details._request_id ?? null,
      durationMs: Date.now() - startedAt,
    });

    if (details.code === "CHAT_LIMIT") {
      if (error instanceof ChatLimitError) headers["Retry-After"] = error.retryAfter;
      return { status: 429, body: { error: (error as Error).message }, headers };
    }

    return { status: 503, body: {
      error: "Tuna is currently unavailable. Please try again later.",
    }, headers };
  }
};
