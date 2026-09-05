import {
  CHAT_RATE_LIMIT_CLEANUP_MS,
  CHAT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_CHAT_REQUESTS_PER_MINUTE,
} from "../utils/chatUtils/chat.consts.js";

const ipRequests = new Map<string, { windowStart: number; count: number }>();
let lastCleanup = Date.now();

const numberEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

// permit normal use while stopping rapid automated bursts. resets with the backend process.
const requestsPerMinute = numberEnv(
  "CHAT_REQUESTS_PER_MINUTE",
  DEFAULT_CHAT_REQUESTS_PER_MINUTE,
);

type ChatLimitError = Error & { status: number; code: "CHAT_LIMIT" };

function limitError(): ChatLimitError {
  const error = new Error(
    "You're sending messages too quickly. Please wait a moment.",
  ) as ChatLimitError;
  error.status = 429;
  error.code = "CHAT_LIMIT";
  return error;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - lastCleanup > CHAT_RATE_LIMIT_CLEANUP_MS) {
    for (const [key, entry] of ipRequests) {
      if (now - entry.windowStart > CHAT_RATE_LIMIT_WINDOW_MS)
        ipRequests.delete(key);
    }
    lastCleanup = now;
  }

  const entry = ipRequests.get(ip);
  if (!entry || now - entry.windowStart > CHAT_RATE_LIMIT_WINDOW_MS) {
    ipRequests.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > requestsPerMinute;
}

/** Checks the in-process, per-IP burst limit. Chat content is never stored. */
export function reserveChatRequest(ip: string): void {
  if (isRateLimited(ip)) throw limitError();
}
