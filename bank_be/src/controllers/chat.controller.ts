import type { RequestHandler, Response } from "express";
import OpenAI from "openai";
import {
  MAX_OUTPUT_TOKENS,
  OUT_OF_SCOPE_REPLY,
  SAFE_REPLY_FALLBACK,
  SYSTEM_INSTRUCTIONS,
  TUNA_MASCOT_REPLY,
  UNSAFE_REPLY_PATTERN,
} from "../utils/chatUtils/chat.consts.js";
import { reserveChatRequest } from "../services/chatRateLimit.service.js";
import { randomUUID } from "node:crypto";
import {
  chatLog,
  conversationInput,
  isSupportScope,
  isTunaMascotQuestion,
  validateChatRequest,
} from "../utils/chatUtils/chat.helpers.js";
import { logError } from "../utils/logger.js";

type OpenAIErrorDetails = Error & {
  status?: number;
  code?: string;
  type?: string;
  request_id?: string;
  requestID?: string;
  _request_id?: string;
};

const PROVIDER = process.env.OPENROUTER_API_KEY ? "openrouter" : "openai";
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

export const chat: RequestHandler = async (req, res: Response) => {
  const chatRequestId = randomUUID();
  const startedAt = Date.now();
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const validation = validateChatRequest(message, req.body?.history);

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
    return void res.status(400).json({ error: validation.error });
  }
  const { history } = validation;

  //check for mascot question or out of scope question to not consume model usage
  if (isTunaMascotQuestion(message)) {
    chatLog("mascot_reply", { chatRequestId });
    return void res.status(200).json({ reply: TUNA_MASCOT_REPLY });
  }
  if (!isSupportScope(message)) {
    chatLog("out_of_scope_reply", { chatRequestId });
    return void res.status(200).json({ reply: OUT_OF_SCOPE_REPLY });
  }

  if (!API_KEY) {
    chatLog("request_rejected", {
      chatRequestId,
      reason: "missing_llm_api_key",
    });
    return void res
      .status(503)
      .json({ error: "Support chat is not configured yet." });
  }

  try {
    reserveChatRequest(req.ip || "unknown");
    chatLog("rate_limit_passed", { chatRequestId, provider: PROVIDER });

    const client = new OpenAI({
      apiKey: API_KEY,
      ...(PROVIDER === "openrouter"
        ? {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
              "HTTP-Referer":
                process.env.OPENROUTER_SITE_URL ||
                process.env.FRONTEND_BASE_URL ||
                "http://localhost:5173",
              "X-Title": "TunaBank Learning Project",
            },
          }
        : {}),
    });

    // OpenRouter's free router does not offer OpenAI's Moderations endpoint.
    if (PROVIDER === "openai") {
      const moderation = await client.moderations.create(
        { model: "omni-moderation-latest", input: message },
        { headers: { "X-Client-Request-Id": chatRequestId } },
      );
      chatLog("moderation_completed", {
        chatRequestId,
        provider: PROVIDER,
        providerRequestId:
          (moderation as typeof moderation & { _request_id?: string | null })
            ._request_id ?? null,
        flagged: moderation.results[0]?.flagged ?? false,
        durationMs: Date.now() - startedAt,
      });
      if (moderation.results[0]?.flagged) {
        chatLog("request_rejected", {
          chatRequestId,
          reason: "moderation_flagged",
        });
        return void res.status(400).json({
          error:
            "I can’t help with that request. Please keep the chat focused on account support.",
        });
      }
    } else {
      chatLog("moderation_bypassed", {
        chatRequestId,
        provider: PROVIDER,
        reason: "endpoint_unavailable",
      });
    }

    const response = await client.responses.create(
      {
        model:
          PROVIDER === "openrouter"
            ? process.env.OPENROUTER_CHAT_MODEL || "openrouter/free"
            : process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
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
      return void res.status(200).json({ reply: SAFE_REPLY_FALLBACK });
    }

    res.status(200).json({ reply });
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
      return void res.status(429).json({ error: (error as Error).message });
    }

    res.status(503).json({
      error: "Tuna is currently unavailable. Please try again later.",
    });
  }
};
