import type { z } from "zod";
import type { assistantRouteSchema } from "../utils/assistantUtils/assistant.helpers.js";

export type AssistantRoute = z.infer<typeof assistantRouteSchema>;

/** Constructed server-side after JWT verification and account lookup. */
export type AssistantAccount = Readonly<{ id: string }>;

export const ASSISTANT_ERROR_CODES = {
  UNAVAILABLE: "ASSISTANT_UNAVAILABLE",
  TIMEOUT: "ASSISTANT_TIMEOUT",
  INVALID_REQUEST: "INVALID_REQUEST",
  ACCOUNT_UNAVAILABLE: "ACCOUNT_UNAVAILABLE",
  CHAT_LIMIT: "CHAT_LIMIT",
} as const;

export type AssistantErrorCode = typeof ASSISTANT_ERROR_CODES[keyof typeof ASSISTANT_ERROR_CODES];

export type AssistantChatResponse =
  | { reply: string }
  | { error: string; code: AssistantErrorCode };

export type AssistantTransaction = {
  id: string;
  direction: "sent" | "received";
  counterpartyName: string;
  amount: string;
  timestamp: string;
};

export type AssistantSummary = {
  start: string;
  end: string;
  sent: { count: number; total: string };
  received: { count: number; total: string };
  net: string;
};
