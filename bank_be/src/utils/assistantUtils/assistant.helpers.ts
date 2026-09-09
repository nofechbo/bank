import { z } from "zod";
import type { AssistantSummary, AssistantTransaction } from "../../types/assistant.types.js";
import {
  ASSISTANT_MAX_TRANSACTION_LIMIT, ASSISTANT_MAX_REPLY_CHARS,
  ASSISTANT_MAX_COUNTERPARTY_CHARS,
} from "./assistant.consts.js";
import { SAFE_REPLY_FALLBACK, UNSAFE_REPLY_PATTERN } from "../chatUtils/chat.consts.js";

// A routing decision is model output, not permission or evidence of an action.
export const assistantRouteSchema = z.object({
  intent: z.enum(["balance", "recent", "transaction", "summary", "transfer", "support", "clarify", "out_of_scope"]),
  limit: z.number().int().min(1).max(ASSISTANT_MAX_TRANSACTION_LIMIT).optional(),
  transactionId: z.string().uuid().optional(),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
  recipient: z.string().email().optional(),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(),
  reply: z.string().max(ASSISTANT_MAX_REPLY_CHARS).optional(),
}).strict();

export function safeAssistantReply(reply: string): string {
  if (!reply.trim() || reply.length > ASSISTANT_MAX_REPLY_CHARS || UNSAFE_REPLY_PATTERN.test(reply)
    || /\b(?:I(?:'ve| have)?|we(?:'ve| have)?)\s+(?:successfully\s+)?(?:sent|transferred|cancelled|reversed|refunded|updated|reset)\b/i.test(reply)) {
    return SAFE_REPLY_FALLBACK;
  }
  return reply.trim();
}

/** Amounts come straight from trusted tools; no model arithmetic or guessed currency. */
export function describeTransaction(transaction: AssistantTransaction): string {
  const name = transaction.counterpartyName.replace(/[\r\n\t]/g, " ").slice(0, ASSISTANT_MAX_COUNTERPARTY_CHARS);
  return `You ${transaction.direction} ${transaction.amount} ${transaction.direction === "sent" ? "to" : "from"} ${JSON.stringify(name)} on ${transaction.timestamp} (UTC).`;
}

export function describeTransactions(transactions: AssistantTransaction[]): string {
  if (!transactions.length) return "You have no recorded transactions.";
  const lines: string[] = [];
  for (const transaction of transactions) {
    const line = describeTransaction(transaction);
    if ([...lines, line].join("\n").length > ASSISTANT_MAX_REPLY_CHARS - ASSISTANT_MAX_COUNTERPARTY_CHARS) break;
    lines.push(line);
  }
  if (lines.length < transactions.length) lines.push(`Showing ${lines.length} transactions. Ask for a smaller selection for more detail.`);
  return lines.join("\n");
}

export function describeSummary(summary: AssistantSummary): string {
  return `From ${summary.start} up to (but not including) ${summary.end}, you sent ${summary.sent.total} across ${summary.sent.count} transfers and received ${summary.received.total} across ${summary.received.count} transfers. Net received minus sent: ${summary.net}. These totals cover recorded transfers, not your historical balance.`;
}
