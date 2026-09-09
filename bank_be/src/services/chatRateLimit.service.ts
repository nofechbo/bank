import {
  DEFAULT_CHAT_REQUESTS_PER_MINUTE,
  CHAT_USER_REQUESTS_PER_MINUTE,
  CHAT_MODEL_CALLS_PER_DAY,
  CHAT_RATE_LIMIT_WINDOW_MS,
  CHAT_RATE_LIMIT_CLEANUP_MS,
  MILLISECONDS_PER_SECOND,
  CHAT_RATE_LIMIT_RETRY_SECONDS,
  CHAT_DAILY_WINDOW_MS,
  CHAT_RATE_LIMIT_MAX_ENTRIES,
  CHAT_RATE_LIMIT_HTTP_STATUS,
} from "../utils/chatUtils/chat.consts.js";

export class ChatLimitError extends Error {
  readonly status = CHAT_RATE_LIMIT_HTTP_STATUS;
  readonly code = "CHAT_LIMIT";
  constructor(readonly retryAfter: number) {
    super("Chat usage limit reached. Please try again later.");
  }
}

type Counter = { count: number; expiresAt: number };

/** One instance is shared by both routes. Resets on restart; not shared between
 * server processes. The clock argument allows expiry tests without sleeping.
 */
export function createChatLimiter(now: () => number = Date.now) {
  const requests = new Map<string, Counter>();
  let daily: Counter = { count: 0, expiresAt: 0 };
  let lastCleanup = 0;

  return {
    reserveRequest(ip: string, userId?: string): void {
      const time = now();
      if (time - lastCleanup >= CHAT_RATE_LIMIT_CLEANUP_MS || requests.size >= CHAT_RATE_LIMIT_MAX_ENTRIES) {
        for (const [key, entry] of requests) {
          if (entry.expiresAt <= time) requests.delete(key);
        }
        lastCleanup = time;
      }
      const checks: [string, number][] = [[`ip:${ip}`, DEFAULT_CHAT_REQUESTS_PER_MINUTE]];
      if (userId) checks.push([`user:${userId}`, CHAT_USER_REQUESTS_PER_MINUTE]);
      // Check every limit before committing; synchronous operations cannot interleave.
      for (const [key, maximum] of checks) {
        const entry = requests.get(key);
        if (maximum === 0 || (entry && entry.expiresAt > time && entry.count >= maximum)) {
          throw new ChatLimitError(entry && entry.expiresAt > time ? Math.ceil((entry.expiresAt - time) / MILLISECONDS_PER_SECOND) : CHAT_RATE_LIMIT_RETRY_SECONDS);
        }
      }
      const newEntries = checks.filter(([key]) => !requests.has(key)).length;
      // Bound memory under a flood of distinct identifiers; do not evict active limits.
      if (requests.size + newEntries > CHAT_RATE_LIMIT_MAX_ENTRIES) throw new ChatLimitError(CHAT_RATE_LIMIT_RETRY_SECONDS);
      for (const [key] of checks) {
        const entry = requests.get(key);
        requests.set(key, entry && entry.expiresAt > time
          ? { ...entry, count: entry.count + 1 }
          : { count: 1, expiresAt: time + CHAT_RATE_LIMIT_WINDOW_MS });
      }
    },
    reserveModelCall(): void {
      const time = now();
      const maximum = CHAT_MODEL_CALLS_PER_DAY;
      if (daily.expiresAt <= time) daily = { count: 0, expiresAt: (Math.floor(time / CHAT_DAILY_WINDOW_MS) + 1) * CHAT_DAILY_WINDOW_MS };
      if (daily.count >= maximum) throw new ChatLimitError(Math.ceil((daily.expiresAt - time) / MILLISECONDS_PER_SECOND));
      daily.count += 1;
    },
  };
}

const sharedLimiter = createChatLimiter();

/** Shared public/private request limits, held only in process memory. */
export function reserveChatRequest(ip: string, userId?: string): void {
  sharedLimiter.reserveRequest(ip, userId);
}

/** Reserve before EVERY provider call, including future graph calls.
 * Failed calls stay charged. Disable automatic SDK retries.
 * This is a UTC-day call ceiling, not exact token accounting.
 */
export function reserveChatModelCall(): void {
  sharedLimiter.reserveModelCall();
}
