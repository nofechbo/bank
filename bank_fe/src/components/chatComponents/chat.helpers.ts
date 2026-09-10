import {
  ASSISTANT_INVITE_STORAGE_KEY_PREFIX,
  ASSISTANT_OPENING_MESSAGE,
  ASSISTANT_ROUTES,
  ASSISTANT_STORAGE_KEY_PREFIX,
  DEFAULT_RETRY_AFTER_SECONDS,
  MAX_HISTORY_MESSAGES,
  MAX_INPUT_CHARS,
  MAX_STORED_MESSAGES,
  MILLISECONDS_PER_SECOND,
  SUPPORT_OPENING_MESSAGE,
  type ChatHistoryItem,
  type ChatMessage,
  type ChatMode,
} from "./chat.consts";

function accountScope(email: string): string {
  return encodeURIComponent(email.trim().toLowerCase());
}

export function assistantStorageKey(email: string): string {
  return `${ASSISTANT_STORAGE_KEY_PREFIX}${accountScope(email)}`;
}

export function assistantInviteKey(email: string): string {
  return `${ASSISTANT_INVITE_STORAGE_KEY_PREFIX}${accountScope(email)}`;
}

export function wasAssistantInviteShown(key: string): boolean {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function markAssistantInviteShown(key: string): void {
  try {
    sessionStorage.setItem(key, "shown");
  } catch {
    // Without storage the invitation simply appears again in a later session.
  }
}

export function openingMessage(mode: ChatMode): ChatMessage {
  return {
    role: "assistant",
    text: mode === "assistant" ? ASSISTANT_OPENING_MESSAGE : SUPPORT_OPENING_MESSAGE,
    local: true,
  };
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, text } = value as ChatMessage;
  return (role === "user" || role === "assistant") && typeof text === "string";
}

/** Stored messages are untrusted display data: they are never authorization,
 * proof of a tool result, or confirmation that a transfer happened.
 */
export function readStoredMessages(key: string, mode: ChatMode): ChatMessage[] {
  const opening = openingMessage(mode);
  try {
    const saved = sessionStorage.getItem(key);
    if (!saved) return [opening];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [opening];
    const messages = parsed
      .filter(isChatMessage)
      .map(({ role, text, local }) => ({ role, text, ...(local ? { local: true as const } : {}) }))
      .slice(-MAX_STORED_MESSAGES);
    return messages.length ? messages : [opening];
  } catch {
    return [opening];
  }
}

export function writeStoredMessages(key: string, messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // The chat still works when browser storage is unavailable or full.
  }
}

export function removeStoredKey(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clean up when browser storage is unavailable.
  }
}

export function submittedHistory(messages: ChatMessage[]): ChatHistoryItem[] {
  return messages
    .filter((item) => !item.local)
    .map(({ role, text }) => ({ role, text: text.trim().slice(0, MAX_INPUT_CHARS) }))
    .filter((item) => item.text.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

/** Preserve the full server wait, including daily quotas and HTTP dates.
 * Fall back to a fixed wait when the header is missing or unreadable.
 */
export function parseRetryAfterSeconds(header: string | null): number {
  if (!header?.trim()) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = /^\d+$/.test(header.trim())
    ? Number(header.trim())
    : (Date.parse(header) - Date.now()) / MILLISECONDS_PER_SECOND;
  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_RETRY_AFTER_SECONDS;
  return Math.ceil(seconds);
}

export function isAssistantRoute(pathname: string): boolean {
  return ASSISTANT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Display-only expiry check, so a stale stored token shows the public chatbot
 * instead of a private mode that cannot answer. Unreadable tokens are left to
 * the server, which is the only authority on whether a session is valid.
 */
export function isExpiredToken(token: string | null): boolean {
  if (!token) return true;
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof exp === "number" && exp * MILLISECONDS_PER_SECOND <= Date.now();
  } catch {
    return false;
  }
}
