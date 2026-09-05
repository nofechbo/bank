import {
  GREETING_PATTERN,
  INJECTION_PATTERN,
  INVALID_HISTORY_ERROR,
  INVALID_MESSAGE_LENGTH_ERROR,
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
  MAX_INPUT_CHARS,
  PROMPT_INJECTION_ERROR,
  SCOPE_TERMS,
  TUNA_MASCOT_QUESTION_PATTERN,
  TUNA_MASCOT_SUBJECT_PATTERN,
  TUNA_ONLY_PATTERN,
} from "./chat.consts.js";
import { logInfo } from "../logger.js";

export type ChatHistoryMessage = { role: "user" | "assistant"; text: string };

type ChatRequestValidation =
  | { valid: true; history: ChatHistoryMessage[] }
  | { valid: false; reason: string; error: string };

function parseHistory(value: unknown): ChatHistoryMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) return null;
  const history: ChatHistoryMessage[] = [];
  let totalChars = 0;
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") return null;
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length > MAX_INPUT_CHARS) return null;
    totalChars += trimmedText.length;
    if (totalChars > MAX_HISTORY_CHARS) return null;
    history.push({ role, text: trimmedText });
  }
  return history;
}

export function validateChatRequest(message: string, historyValue: unknown): ChatRequestValidation {
  if (!message || message.length > MAX_INPUT_CHARS) {
    return { valid: false, reason: "invalid_message_length", error: INVALID_MESSAGE_LENGTH_ERROR };
  }
  const history = parseHistory(historyValue);
  if (!history) return { valid: false, reason: "invalid_history", error: INVALID_HISTORY_ERROR };
  if (INJECTION_PATTERN.test(message)) {
    return { valid: false, reason: "prompt_injection_pattern", error: PROMPT_INJECTION_ERROR };
  }
  return { valid: true, history };
}

export function conversationInput(history: ChatHistoryMessage[], message: string): string {
  if (!history.length) return message;
  const context = history.map((item) => `${item.role === "user" ? "Customer" : "Tuna"}: ${item.text}`).join("\n");
  return `Recent conversation for context only:\n${context}\n\nLatest customer message: ${message}`;
}

export function isTunaMascotQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return TUNA_MASCOT_SUBJECT_PATTERN.test(normalized)
    && (TUNA_ONLY_PATTERN.test(normalized) || TUNA_MASCOT_QUESTION_PATTERN.test(normalized));
}

export function isSupportScope(message: string): boolean {
  const normalized = message.toLowerCase();
  return GREETING_PATTERN.test(normalized) || SCOPE_TERMS.some((term) => normalized.includes(term));
}

export function chatLog(event: string, fields: Record<string, unknown> = {}): void {
  logInfo(event, { service: "support-chat", ...fields });
}
