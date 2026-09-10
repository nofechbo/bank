/** Shared constants for the single floating chat, in both of its modes. */

export type ChatMode = "support" | "assistant";

/** `local` marks messages this component created (opening text, errors and notices).
 * They are displayed but never submitted back as conversation history.
 */
export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  local?: boolean;
};

export type ChatHistoryItem = { role: "user" | "assistant"; text: string };

export const SUPPORT_STORAGE_KEY = "tunabank-support-chat";
/** One private key per account. This only separates stored conversations in a
 * browser tab; it is never proof of identity. The backend authenticates every
 * private request with the JWT.
 */
export const ASSISTANT_STORAGE_KEY_PREFIX = "tunabank-assistant-chat:";
export const ASSISTANT_INVITE_STORAGE_KEY_PREFIX = "tunabank-assistant-invite:";

export const SUPPORT_ENDPOINT = "/support/chat";
export const ASSISTANT_ENDPOINT = "/assistant/chat";

export const ASSISTANT_ROUTES = ["/dashboard", "/transfer"] as const;

/** Kept in step with the backend limits in chat.consts.ts. */
export const MAX_HISTORY_MESSAGES = 6;
export const MAX_INPUT_CHARS = 1_500;
/** Bounds what a single tab keeps in session storage. */
export const MAX_STORED_MESSAGES = 60;
export const MAX_ERROR_CHARS = 300;

export const MILLISECONDS_PER_SECOND = 1_000;
export const DEFAULT_RETRY_AFTER_SECONDS = 60;
export const RETRY_COUNTDOWN_TICK_MS = 250;

export const SUPPORT_OPENING_MESSAGE =
  "Hi, I’m Tuna. I can explain how to use TunaBank and provide general banking information. I can’t access or change your account.";
export const ASSISTANT_OPENING_MESSAGE =
  "Hi! I’m your purrfect banking assistant. I can check your balance, explain recent transactions, and help you prepare a transfer. What can I help you with?";

export const ASSISTANT_SUGGESTIONS = [
  "My balance",
  "Recent transactions",
  "Prepare a transfer",
] as const;

export const ASSISTANT_INVITE_TEXT = "Your purrfect assistant is here. Try me!";
export const ASSISTANT_INVITE_DISPLAY_MS = 12_000;

export const UNAVAILABLE_MESSAGE =
  "Tuna is currently unavailable. Please try again later.";
export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again to continue with your banking assistant.";
export const SESSION_EXPIRED_NOTICE = "Session expired. Please sign in again.";

export function rateLimitNotice(seconds: number): string {
  return `Too many messages. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

export const CHAT_MODE_THEME = {
  support: {
    headerBg: "primary.main",
    headerColor: "primary.contrastText",
    userBubble: "primary.light",
    sendBg: undefined,
    buttonAccent: "#0f766e",
    buttonHover: "#f0fdfa",
    title: "TunaBank support",
    caption: "Never share passwords or verification codes.",
    openLabel: "Open TunaBank support chat",
    closeLabel: "Close support chat",
    buttonText: "Chat with Tuna",
    tooltip: "Ask about TunaBank",
    placeholder: "Ask about TunaBank",
  },
  assistant: {
    headerBg: "#5b21b6",
    headerColor: "#ffffff",
    userBubble: "#ddd6fe",
    sendBg: "#5b21b6",
    buttonAccent: "#5b21b6",
    buttonHover: "#f5f3ff",
    title: "Tuna · Your banking assistant",
    caption: "Never share passwords or verification codes.",
    openLabel: "Open your TunaBank banking assistant",
    closeLabel: "Close banking assistant",
    buttonText: "Your banking assistant",
    tooltip: "Ask about your account",
    placeholder: "Ask about your account",
  },
} as const satisfies Record<ChatMode, Record<string, string | undefined>>;
