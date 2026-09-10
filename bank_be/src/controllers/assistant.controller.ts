import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import type { AssistantChatResponse } from "../types/assistant.types.js";
import { ASSISTANT_ERROR_CODES } from "../types/assistant.types.js";
import { assistantChat, resolveAssistantAccount } from "../services/assistant/assistant.service.js";
import { ChatLimitError, reserveChatRequest } from "../services/chatRateLimit.service.js";
import { validateChatRequest } from "../utils/chatUtils/chat.helpers.js";

export async function chatWithAssistant(req: AuthenticatedRequest, res: Response<AssistantChatResponse>) {
  res.setHeader("Cache-Control", "no-store");
  if (!req.user) {
    res.status(401).json({ code: ASSISTANT_ERROR_CODES.ACCOUNT_UNAVAILABLE, error: "Authentication required." });
    return;
  }

  const account = await resolveAssistantAccount(req.user.email);
  if (!account) {
    res.status(403).json({ code: ASSISTANT_ERROR_CODES.ACCOUNT_UNAVAILABLE, error: "Account unavailable." });
    return;
  }

  try {
    await reserveChatRequest(req.ip || "unknown", account.id);
  } catch (error) {
    if (!(error instanceof ChatLimitError)) throw error;
    res.setHeader("Retry-After", error.retryAfter);
    res.status(429).json({ code: ASSISTANT_ERROR_CODES.CHAT_LIMIT, error: error.message });
    return;
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const validation = validateChatRequest(message, req.body?.history);
  if (!validation.valid) {
    res.status(400).json({ code: ASSISTANT_ERROR_CODES.INVALID_REQUEST, error: validation.error });
    return;
  }
  
  // Body identity fields are never passed to the service; history is only context.
  try {
    const result = await assistantChat(account, message, validation.history, undefined, req.body?.timeZone);
    res.status("reply" in result ? 200 : result.code === ASSISTANT_ERROR_CODES.TIMEOUT ? 504 : 503).json(result);
  } catch (error) {
    if (!(error instanceof ChatLimitError)) throw error;
    res.setHeader("Retry-After", error.retryAfter);
    res.status(429).json({ code: ASSISTANT_ERROR_CODES.CHAT_LIMIT, error: error.message });
  }
}
