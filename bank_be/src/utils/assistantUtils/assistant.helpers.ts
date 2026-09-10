import { z } from "zod";
import type { AssistantSummary, AssistantTransaction } from "../../types/assistant.types.js";
import {
  ASSISTANT_MAX_TRANSACTION_LIMIT, ASSISTANT_MAX_REPLY_CHARS,
  ASSISTANT_MAX_COUNTERPARTY_CHARS, ASSISTANT_MAX_RECIPIENT_CHARS,
  TRANSFER_AMOUNT_PATTERNS, TRANSFER_RECIPIENT_PATTERN, ASSISTANT_FAILURE_REASONS, ASSISTANT_MAX_LOGGED_FIELDS,
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

export function assistantFailureReason(error: unknown, aborted: boolean): string {
  if (aborted) return "deadline_or_cancellation";
  if (!(error instanceof Error)) return "unknown";
  return ASSISTANT_FAILURE_REASONS.includes(error.message) ? error.message : error.name;
}

export function rejectedRouteFields(decisions: { success: boolean; error?: z.ZodError }[]): string[] {
  const fields = decisions.flatMap(decision =>
    decision.success ? [] : (decision.error?.issues ?? []).map(issue => issue.path.join(".") || issue.code));
  return [...new Set(fields)].slice(0, ASSISTANT_MAX_LOGGED_FIELDS);
}

export function safeAssistantReply(reply: string): string {
  if (!reply.trim() || reply.length > ASSISTANT_MAX_REPLY_CHARS || UNSAFE_REPLY_PATTERN.test(reply)
    || /\b(?:I(?:'ve| have)?|we(?:'ve| have)?)\s+(?:successfully\s+)?(?:sent|transferred|cancelled|reversed|refunded|updated|reset)\b/i.test(reply)) {
    return SAFE_REPLY_FALLBACK;
  }
  return reply.trim();
}

/** Models routinely state a transfer amount in prose and leave the amount field
 * empty, which used to make the assistant ask for the same detail forever. These
 * read the customer's own messages only, never clientAssistant text or model
 * prose, and fill nothing but a draft the customer still reviews and submits on
 * the Transfer page. An ambiguous message yields nothing, so the assistant asks.
 */
export function extractTransferDetails(customerMessages: string[]): { amount?: string; recipient?: string; blockedAmount?: boolean; blockedRecipient?: boolean; newRequest?: boolean } {
  let amount: string | undefined;
  let recipient: string | undefined;
  let amountResolved = false;
  let recipientResolved = false;
  for (const text of customerMessages) {
    if (!amountResolved) {
      const candidates = new Set<string>();
      for (const pattern of TRANSFER_AMOUNT_PATTERNS) {
        for (const match of text.matchAll(pattern)) candidates.add(match[1]);
      }
      const [only] = candidates;
      if (candidates.size) {
        amountResolved = true;
        if (candidates.size === 1 && assistantRouteSchema.shape.amount.safeParse(only).success && Number(only) > 0) amount = only;
      }
    }
    const recipients = text.match(TRANSFER_RECIPIENT_PATTERN) ?? [];
    if (!recipientResolved && recipients.length) {
      recipientResolved = true;
      const cleaned = recipients.map(value => value.replace(/^[<("']+|[>),.!?;:"']+$/g, ""));
      if (cleaned.length === 1 && cleaned[0].length <= ASSISTANT_MAX_RECIPIENT_CHARS && assistantRouteSchema.shape.recipient.safeParse(cleaned[0]).success) recipient = cleaned[0];
    }
    if (amount && recipient) break;
    // A fresh transfer request starts a new collection of details. Never fill
    // its missing/ambiguous fields from an older transfer discussion.
    if (/\b(?:send|sending|transfer|transferring|pay|paying)\b/i.test(text)) break;
  }
  return {
    ...(amount ? { amount } : {}), ...(recipient ? { recipient } : {}),
    ...(amountResolved && !amount ? { blockedAmount: true } : {}),
    ...(recipientResolved && !recipient ? { blockedRecipient: true } : {}),
    ...(/^\s*(?:prepare|start|begin)\b.*\btransfer\b/i.test(customerMessages[0] ?? "") ? { newRequest: true } : {}),
  };
}

/** Repeats what was captured so the customer can correct it before submitting.
 * It never claims money moved and never verifies that a recipient exists.
 */
export function describeTransferDraft(amount: string, recipient: string): string {
  return `Ready to send ${amount} to ${recipient.replace(/[\r\n\t]/g, " ")}? No money has been sent. Open TunaBank's Transfer page to review these details and submit the transfer.`;
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
