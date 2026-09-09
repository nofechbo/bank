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
export const ASSISTANT_UNAVAILABLE_REPLY = "Tuna is currently unavailable. Please try again later.";
export const ASSISTANT_CLARIFY_REPLY = "What would you like help with: your balance, transactions, transfers, or a banking question?";
export const ASSISTANT_TRANSFER_REPLY = "No money has been sent. Review and submit the amount and recipient in TunaBank's Transfer page.";
// Cheap rejection of explicit unrelated generation tasks, even with banking words.
export const ASSISTANT_UNRELATED_TASK_PATTERN = /\b(?:write|generate|create|build|debug|implement)\b.{0,80}\b(?:python|javascript|typescript|program|script|poem|poetry|essay)\b|\b(?:write|generate)\s+(?:(?:me|some|a|the)\s+)*code\b/i;

export const ASSISTANT_TOOL_NAMES = {
  BALANCE: "getMyBalance",
  RECENT_TRANSACTIONS: "getMyRecentTransactions",
  TRANSACTION: "getMyTransaction",
  SUMMARY: "getMyTransactionSummary",
} as const;
