export const ASSISTANT_DEFAULT_TRANSACTION_LIMIT = 5;
export const ASSISTANT_MAX_TRANSACTION_LIMIT = 20;
export const ASSISTANT_MAX_SUMMARY_DAYS = 366;
export const ASSISTANT_DAY_MS = 86_400_000;
export const ASSISTANT_MODEL_TIMEOUT_MS = 30_000;
export const ASSISTANT_MODEL_MAX_RETRIES = 0;
export const ASSISTANT_MODEL_MAX_OUTPUT_TOKENS = 450;
export const ASSISTANT_DEFAULT_MODEL = "openrouter/free";
export const ASSISTANT_TURN_TIMEOUT_MS = 45_000;
export const ASSISTANT_MAX_CONCURRENT_TURNS = 4;
export const ASSISTANT_BUSY_RETRY_SECONDS = 5;
export const ASSISTANT_GRAPH_RECURSION_LIMIT = 6;
export const ASSISTANT_MAX_REPLY_CHARS = 1_500;
export const ASSISTANT_ROUTE_TOOL = "routeBankingRequest";
export const ASSISTANT_MAX_COUNTERPARTY_CHARS = 80;
export const ASSISTANT_MAX_RECIPIENT_CHARS = 254;
// An amount needs a transfer-shaped context: a bare follow-up such as "100",
// a number after send/transfer/pay, or a number before "to". A plain number in
// "order 12" or a date is not an amount.
export const TRANSFER_AMOUNT_PATTERNS = [
  /^\s*\$?([+-]?\d[\d.,]*)\s*$/g,
  /\b(?:send|sending|transfer|transferring|pay|paying|amount\s+of|amount)\s+\$?([+-]?\d[\d.,]*)(?!\w)/gi,
  /(?<![\w.,+\-])\$?([+-]?\d[\d.,]*)\s+to\b/gi,
];
export const TRANSFER_RECIPIENT_PATTERN = /[^\s@]+@[^\s@.]+\.[^\s@]+/g;
export const ASSISTANT_UNAVAILABLE_REPLY = "Tuna is currently unavailable. Please try again later.";
export const ASSISTANT_CLARIFY_REPLY = "What would you like help with: your balance, transactions, transfers, or a banking question?";
export const ASSISTANT_TRANSFER_REPLY = "No money has been sent. Review and submit the amount and recipient in TunaBank's Transfer page.";
export const ASSISTANT_TRANSFER_AMOUNT_QUESTION = "What amount would you like to transfer? I can guide you; you will review and submit it on the Transfer page.";
export const ASSISTANT_TRANSFER_RECIPIENT_QUESTION = "What is the recipient's email address? No money has been sent.";
// Cheap rejection of explicit unrelated generation tasks, even with banking words.
export const ASSISTANT_UNRELATED_TASK_PATTERN = /\b(?:write|generate|create|build|debug|implement)\b.{0,80}\b(?:python|javascript|typescript|program|script|poem|poetry|essay)\b|\b(?:write|generate)\s+(?:(?:me|some|a|the)\s+)*code\b/i;

export const ASSISTANT_FAILURES = {
  NOT_CONFIGURED: "openrouter_not_configured",
  NO_VALID_ROUTE: "no_valid_routing_decision",
  UNSUPPORTED_INTENT: "unsupported_data_intent",
  TOOL_UNAVAILABLE: "banking_tool_unavailable",
} as const;

export const ASSISTANT_MAX_LOGGED_FIELDS = 8;

export const ASSISTANT_FAILURE_REASONS: readonly string[] = Object.values(ASSISTANT_FAILURES);

export const ASSISTANT_TOOL_NAMES = {
  BALANCE: "getMyBalance",
  RECENT_TRANSACTIONS: "getMyRecentTransactions",
  TRANSACTION: "getMyTransaction",
  SUMMARY: "getMyTransactionSummary",
} as const;
