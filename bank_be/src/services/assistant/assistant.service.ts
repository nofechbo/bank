import { ChatOpenRouter } from "@langchain/openrouter";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { createAssistantTools } from "./assistantTools.service.js";
import { reserveChatModelCall } from "../chatRateLimit.service.js";
import {
  ASSISTANT_DEFAULT_MODEL,
  ASSISTANT_MODEL_MAX_OUTPUT_TOKENS,
  ASSISTANT_MODEL_MAX_RETRIES,
  ASSISTANT_MODEL_TIMEOUT_MS,
} from "../../utils/assistantUtils/assistant.consts.js";
import { dbInstance } from "../../db/prisma.js";
import type { AssistantAccount, AssistantChatResponse } from "../../types/assistant.types.js";
import { ASSISTANT_ERROR_CODES } from "../../types/assistant.types.js";

/** Only pass the email from verified JWT middleware, never a request body. */
export async function resolveAssistantAccount(verifiedEmail: string): Promise<AssistantAccount | null> {
  return dbInstance.user.findFirst({
    where: { email: verifiedEmail, isVerified: true },
    select: { id: true },
  });
}

/** Restricts transaction queries to the authenticated user */
export function ownedTransactionWhere(account: AssistantAccount) {
  return { OR: [{ fromUserId: account.id }, { toUserId: account.id }] };
}

// Steps 2/3 will supply tools and graph execution.
export async function assistantChat(_account: AssistantAccount): Promise<AssistantChatResponse> {
  return { code: ASSISTANT_ERROR_CODES.NOT_READY, error: "Your banking assistant is not available yet." };
}

/** Configures model calls with tool binding, quota checks, output limits and
 * timeouts. Step 3 will call this adapter; it does not execute banking tools.
 */
export function createAssistantModel(tools: ReturnType<typeof createAssistantTools>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter is not configured for the banking assistant.");
  const model = new ChatOpenRouter({
    apiKey,
    model: process.env.OPENROUTER_CHAT_MODEL || ASSISTANT_DEFAULT_MODEL,
    maxTokens: ASSISTANT_MODEL_MAX_OUTPUT_TOKENS,
    maxRetries: ASSISTANT_MODEL_MAX_RETRIES,
    siteUrl: process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_BASE_URL,
    siteName: "TunaBank Learning Project",
  }).bindTools(tools);

  return {
    async invoke(messages: BaseLanguageModelInput, signal?: AbortSignal) {
      const deadline = AbortSignal.timeout(ASSISTANT_MODEL_TIMEOUT_MS);
      const combinedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
      combinedSignal.throwIfAborted();
      reserveChatModelCall();
      return model.invoke(messages, { signal: combinedSignal });
    },
  };
}
