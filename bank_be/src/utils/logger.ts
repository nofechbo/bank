type ErrorLike = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  code?: unknown;
  type?: unknown;
  requestID?: unknown;
  request_id?: unknown;
  _request_id?: unknown;
};

function safeText(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  return value
    .replace(/sk-[\w-]+/g, "[redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, maxLength);
}

export function logInfo(event: string, details: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

// Keep general error logs actionable without serializing request bodies, headers,
// cookies, database connection strings, stack traces, or arbitrary error objects.
export function logError(event: string, error: unknown, details: Record<string, unknown> = {}): void {
  const value = (error && typeof error === "object" ? error : {}) as ErrorLike;
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...details,
    errorName: typeof value.name === "string" ? value.name : "Error",
    message: safeText(value.message),
    status: typeof value.status === "number" ? value.status : null,
    errorCode: safeText(value.code, 100),
    errorType: safeText(value.type, 100),
    requestId: safeText(value.requestID ?? value.request_id ?? value._request_id, 100),
  }));
}
