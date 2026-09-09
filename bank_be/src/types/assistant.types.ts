/** Constructed server-side after JWT verification and account lookup. */
export type AssistantAccount = Readonly<{ id: string }>;

export const ASSISTANT_ERROR_CODES = {
  NOT_READY: "ASSISTANT_NOT_READY",
  INVALID_REQUEST: "INVALID_REQUEST",
  ACCOUNT_UNAVAILABLE: "ACCOUNT_UNAVAILABLE",
  CHAT_LIMIT: "CHAT_LIMIT",
} as const;

export type AssistantErrorCode = typeof ASSISTANT_ERROR_CODES[keyof typeof ASSISTANT_ERROR_CODES];

export type AssistantChatResponse =
  | { reply: string }
  | { error: string; code: AssistantErrorCode };
