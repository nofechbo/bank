export type ChatHistoryMessage = { role: "user" | "assistant"; text: string };

export type ChatRequestValidation =
  | { valid: true; history: ChatHistoryMessage[] }
  | { valid: false; reason: string; error: string };

export type OpenAIErrorDetails = Error & {
  status?: number;
  code?: string;
  type?: string;
  request_id?: string;
  requestID?: string;
  _request_id?: string;
};
