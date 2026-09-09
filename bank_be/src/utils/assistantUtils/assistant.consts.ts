export const ASSISTANT_DEFAULT_TRANSACTION_LIMIT = 5;
export const ASSISTANT_MAX_TRANSACTION_LIMIT = 20;
export const ASSISTANT_MAX_SUMMARY_DAYS = 366;
export const ASSISTANT_DAY_MS = 86_400_000;
export const ASSISTANT_MODEL_TIMEOUT_MS = 30_000;
export const ASSISTANT_MODEL_MAX_RETRIES = 0;
export const ASSISTANT_MODEL_MAX_OUTPUT_TOKENS = 450;
export const ASSISTANT_DEFAULT_MODEL = "openrouter/free";

export const ASSISTANT_TOOL_NAMES = {
  BALANCE: "getMyBalance",
  RECENT_TRANSACTIONS: "getMyRecentTransactions",
  TRANSACTION: "getMyTransaction",
  SUMMARY: "getMyTransactionSummary",
} as const;
