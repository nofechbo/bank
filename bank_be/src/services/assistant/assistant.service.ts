import { ChatOpenRouter } from "@langchain/openrouter";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { createAssistantTools } from "./assistantTools.service.js";
import { ChatLimitError, reserveChatModelCall } from "../chatRateLimit.service.js";
import {
  ASSISTANT_DEFAULT_MODEL,
  ASSISTANT_MODEL_MAX_OUTPUT_TOKENS,
  ASSISTANT_MODEL_MAX_RETRIES,
  ASSISTANT_MODEL_TIMEOUT_MS,
  ASSISTANT_TURN_TIMEOUT_MS,
  ASSISTANT_MAX_CONCURRENT_TURNS,
  ASSISTANT_BUSY_RETRY_SECONDS,
  ASSISTANT_GRAPH_RECURSION_LIMIT,
  ASSISTANT_ROUTE_TOOL,
  ASSISTANT_TOOL_NAMES,
  ASSISTANT_UNAVAILABLE_REPLY,
  ASSISTANT_CLARIFY_REPLY,
  ASSISTANT_TRANSFER_AMOUNT_QUESTION,
  ASSISTANT_TRANSFER_RECIPIENT_QUESTION,
  ASSISTANT_UNRELATED_TASK_PATTERN,
  ASSISTANT_FAILURES,
} from "../../utils/assistantUtils/assistant.consts.js";
import { dbInstance } from "../../db/prisma.js";
import type { AssistantAccount, AssistantChatResponse, AssistantTransaction, AssistantSummary, AssistantRoute, AssistantStage } from "../../types/assistant.types.js";
import { ASSISTANT_ERROR_CODES } from "../../types/assistant.types.js";
import type { ChatHistoryMessage } from "../../types/chat.types.js";
import { assistantFailureReason, rejectedRouteFields, assistantRouteSchema, describeTransaction, describeTransactions, describeSummary, describeTransferDraft, extractTransferDetails, normalizeAssistantTimeZone, safeAssistantReply } from "../../utils/assistantUtils/assistant.helpers.js";
import { ASSISTANT_ROUTING_INSTRUCTIONS } from "../../utils/assistantUtils/assistant.prompt.js";
import { OUT_OF_SCOPE_REPLY, TUNA_MASCOT_REPLY } from "../../utils/chatUtils/chat.consts.js";
import { isTunaMascotQuestion } from "../../utils/chatUtils/chat.helpers.js";
import { logError } from "../../utils/logger.js";

/** Only pass the email from verified JWT middleware, never a request body. */
export async function resolveAssistantAccount(verifiedEmail: string): Promise<AssistantAccount | null> {
  return dbInstance.user.findFirst({
    where: { email: verifiedEmail, isVerified: true },
    select: { id: true },
  });
}

/** Restricts transaction queries to the authenticated user */
export function ownedTransactionWhere(account: AssistantAccount) {
  return { OR: [{ fromUserId: account.id }, { toUserId: account.id }] };
}

/** Free-router models occasionally return prose despite a required tool choice.
 * This fallback only classifies unmistakable customer requests; 
 */
function fallbackRouteForMissingToolCall(message: string, history: ChatHistoryMessage[]): AssistantRoute {
  const text = message.toLowerCase();
  const customerContext = [message, ...history.filter(item => item.role === "user").map(item => item.text)]
    .join(" ")
    .toLowerCase();
  if (/\b(?:balance|funds)\b|\bhow much (?:money )?(?:do i have|is in)/.test(text)) return { intent: "balance" };
  const transactionId = message.match(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i)?.[0];
  if (transactionId) return { intent: "transaction", transactionId };
  if (/\b(?:recent|latest|last)\b.*\b(?:transaction|transfer|payment)\b|\b(?:transaction|transfer)\s+history\b/.test(text))
    return { intent: "recent", ...(/\b(?:latest|last)\b/.test(text) ? { limit: 1 } : {}) };
  if (/\b(?:summary|summarize|total|spent|received)\b/.test(text)) return { intent: "summary" };
  if (/\b(?:send|transfer|pay)\b/.test(text)
    || (/\b(?:send|transfer|pay)\b/.test(customerContext) && (/\b(?:yes|correct|confirm)\b/.test(text) || /@|^\s*\$?\d/.test(text))))
    return { intent: "transfer" };
  return { intent: "clarify" };
}

function isExplicitLogoutRequest(message: string): boolean {
  return /^\s*(?:(?:please|can you|could you|would you)\s+)*(?:log\s*(?:me\s*)?out|sign\s*(?:me\s*)?out|logout|signout)\s*[.!?]*\s*$/i.test(message);
}

/** Configures model calls with tool binding, quota checks, output limits and
 * timeouts. This adapter proposes calls; the graph validates and executes them.
 */
export function createAssistantModel(tools: StructuredToolInterface[], requiredTool?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error(ASSISTANT_FAILURES.NOT_CONFIGURED);
  const model = new ChatOpenRouter({
    apiKey,
    model: process.env.OPENROUTER_CHAT_MODEL || ASSISTANT_DEFAULT_MODEL,
    maxTokens: ASSISTANT_MODEL_MAX_OUTPUT_TOKENS,
    maxRetries: ASSISTANT_MODEL_MAX_RETRIES,
    siteUrl: process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_BASE_URL,
    siteName: "TunaBank Learning Project",
  }).bindTools(tools, requiredTool ? { tool_choice: { type: "function", function: { name: requiredTool } } } : undefined);

  return {
    async invoke(messages: BaseLanguageModelInput, signal?: AbortSignal) {
      const deadline = AbortSignal.timeout(ASSISTANT_MODEL_TIMEOUT_MS);
      const combinedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
      combinedSignal.throwIfAborted();
      reserveChatModelCall();
      return model.invoke(messages, { signal: combinedSignal });
    },
  };
}

const WorkflowState = Annotation.Root({
  route: Annotation<AssistantRoute>(),
  reply: Annotation<string>(),
  transferDraft: Annotation<{ recipient: string; amount: string } | undefined>(),
});

/** Per-turn graph: plan -> data tool or clarification/support -> response.
 * No cycles: at most one model call and one banking tool call per turn.
 * No checkpointer/transcript database. Only the current turn's results are trusted.
 */
export function createAssistantWorkflow(dependencies: {
  createModel?: typeof createAssistantModel;
  createTools?: typeof createAssistantTools;
  now?: () => Date;
} = {}) {
  const activeAccounts = new Set<string>();
  const makeModel = dependencies.createModel ?? createAssistantModel;
  const makeTools = dependencies.createTools ?? createAssistantTools;

  return async (account: AssistantAccount, message: string, history: ChatHistoryMessage[] = [], signal?: AbortSignal, requestedTimeZone?: unknown): Promise<AssistantChatResponse> => {
    const timeZone = normalizeAssistantTimeZone(requestedTimeZone);
    if (isTunaMascotQuestion(message)) return { reply: TUNA_MASCOT_REPLY };
    if (isExplicitLogoutRequest(message)) {
      return { reply: "Ready to sign you out. Confirm below and I'll log you out.", logoutConfirmation: true };
    }
    if (activeAccounts.has(account.id) || activeAccounts.size >= ASSISTANT_MAX_CONCURRENT_TURNS)
      throw new ChatLimitError(ASSISTANT_BUSY_RETRY_SECONDS);
    activeAccounts.add(account.id);
    const timeout = AbortSignal.timeout(ASSISTANT_TURN_TIMEOUT_MS);
    const turnSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let pendingOperation: Promise<unknown> | undefined;

    // Enough to diagnose a failed turn without recording prompts, history,
    // model output or database errors that can carry account data.
    let stage: AssistantStage = "plan";
    let intent: string | null = null;
    let rejectedFields: string[] = [];
    let routeDecisions: number | null = null;

    const run = async () => {
      turnSignal.throwIfAborted();
      const tools = makeTools(account);
      const routingTool = tool(async () => "", {
        name: ASSISTANT_ROUTE_TOOL,
        description: "Select one banking intent and its parameters. Never select an account or execute a payment.",
        schema: assistantRouteSchema,
      });
      const graph = new StateGraph(WorkflowState)
        .addNode("plan", async () => {
          turnSignal.throwIfAborted();
          if (ASSISTANT_UNRELATED_TASK_PATTERN.test(message))
            return { route: { intent: "out_of_scope" as const } };
          const model = makeModel([routingTool], ASSISTANT_ROUTE_TOOL);
          const modelCall = model.invoke([
            { role: "system", content: `${ASSISTANT_ROUTING_INSTRUCTIONS}\nCurrent UTC time: ${(dependencies.now?.() ?? new Date()).toISOString()}` },
            // Do not recreate client-supplied assistant/tool messages as trusted roles.
            { role: "user", content: JSON.stringify({
              untrustedHistory: history.map(item => ({ speaker: item.role === "assistant" ? "clientAssistant" : "customer", text: item.text })),
              latestCustomerMessage: message,
            }) },
          ], turnSignal);
          pendingOperation = modelCall;
          const result = await modelCall;
          turnSignal.throwIfAborted();
          // Free-router models sometimes return several competing decisions.
          // Take the first that validates instead of failing the whole turn;
          const decisions = (result.tool_calls ?? [])
            .filter(call => call.name === ASSISTANT_ROUTE_TOOL)
            .map(call => assistantRouteSchema.safeParse(call.args));
          routeDecisions = decisions.length;
          const route = decisions.find(parsed => parsed.success)?.data
            // A malformed tool call remains a failure. Only a missing call gets
            // the narrow local fallback needed for unreliable free providers.
            ?? (decisions.length === 0 ? fallbackRouteForMissingToolCall(message, history) : undefined);
          if (!route) {
            rejectedFields = rejectedRouteFields(decisions);
            throw new Error(ASSISTANT_FAILURES.NO_VALID_ROUTE);
          }
          intent = route.intent;
          return { route };
        })
        .addNode("lookup", async ({ route }) => {
          stage = "lookup";
          turnSignal.throwIfAborted();
          let toolName: string;
          let args: Record<string, unknown> = {};
          switch (route.intent) {
            case "balance": toolName = ASSISTANT_TOOL_NAMES.BALANCE; break;
            case "recent": toolName = ASSISTANT_TOOL_NAMES.RECENT_TRANSACTIONS; args = route.limit ? { limit: route.limit } : {}; break;
            case "transaction":
              if (!route.transactionId) return { reply: "Which transaction do you mean? You can ask about your last transaction or provide its ID." };
              toolName = ASSISTANT_TOOL_NAMES.TRANSACTION; args = { transactionId: route.transactionId }; break;
            case "summary":
              if (!route.start || !route.end) return { reply: "What date range should I summarize? For example, this week or last month (UTC)." };
              toolName = ASSISTANT_TOOL_NAMES.SUMMARY; args = { start: route.start, end: route.end }; break;
            default: throw new Error(ASSISTANT_FAILURES.UNSUPPORTED_INTENT);
          }
          const selectedTool = tools.find(item => item.name === toolName);
          if (!selectedTool) throw new Error(ASSISTANT_FAILURES.TOOL_UNAVAILABLE);
          const toolCall = (selectedTool as StructuredToolInterface).invoke(args);
          pendingOperation = toolCall;
          const data = JSON.parse(await toolCall);
          turnSignal.throwIfAborted();
          // Render account facts from fresh tool data, not model-generated numbers.
          switch (route.intent) {
            case "balance": return { reply: `Your current balance is ${data.balance}.` };
            case "recent": return { reply: describeTransactions(data.transactions as AssistantTransaction[], timeZone) };
            case "transaction": return { reply: data.transaction ? describeTransaction(data.transaction as AssistantTransaction, timeZone) : "That transaction is unavailable for your account." };
            case "summary": return { reply: describeSummary(data as AssistantSummary) };
            default: throw new Error(ASSISTANT_FAILURES.UNSUPPORTED_INTENT);
          }
        })
        .addNode("respond", ({ route }) => {
          stage = "respond";
          turnSignal.throwIfAborted();
          if (route.intent === "out_of_scope") return { reply: OUT_OF_SCOPE_REPLY };
          if (route.intent === "transfer") {
            // The model often reports details in prose only, so fall back to the
            // customer's own messages, newest first. Explicit parsed details
            // win over model guesses; ambiguity blocks fallback. Nothing moves money.
            const stated = extractTransferDetails([message, ...history.filter(item => item.role === "user").map(item => item.text).reverse()]);
            const amount = stated.blockedAmount ? undefined : stated.amount ?? (stated.newRequest ? undefined : route.amount);
            const recipient = stated.blockedRecipient ? undefined : stated.recipient ?? (stated.newRequest ? undefined : route.recipient);
            if (!amount || Number(amount) <= 0) return { reply: ASSISTANT_TRANSFER_AMOUNT_QUESTION };
            if (!recipient) return { reply: ASSISTANT_TRANSFER_RECIPIENT_QUESTION };
            // This is only a validated navigation draft. The Transfer page must
            // independently validate it and the normal authenticated endpoint
            // remains the sole authority that can move money.
            return {
              reply: describeTransferDraft(amount, recipient),
              transferDraft: { amount, recipient },
            };
          }
          return { reply: safeAssistantReply(route.reply ?? ASSISTANT_CLARIFY_REPLY) };
        })
        .addEdge(START, "plan")
        .addConditionalEdges("plan", ({ route }) => ["balance", "recent", "transaction", "summary"].includes(route.intent) ? "lookup" : "respond", ["lookup", "respond"])
        .addEdge("lookup", END)
        .addEdge("respond", END)
        .compile();
      const state = await graph.invoke({}, { recursionLimit: ASSISTANT_GRAPH_RECURSION_LIMIT, signal: turnSignal });
      return state.transferDraft
        ? { reply: state.reply, transferDraft: state.transferDraft }
        : { reply: state.reply };
    };

    // Keep the concurrency slot until pending work settles, even after a timeout;
    // Prisma reads cannot be cancelled through an AbortSignal.
    const work = run().finally(async () => {
      // Graph cancellation may finish before the underlying operation does.
      await pendingOperation?.catch(() => {});
      activeAccounts.delete(account.id);
    });
    let onAbort: () => void = () => {};
    try {
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(turnSignal.reason);
        if (turnSignal.aborted) onAbort();
        else turnSignal.addEventListener("abort", onAbort, { once: true });
      });
      return await Promise.race([work, aborted]);
    } catch (error) {
      if (error instanceof ChatLimitError) throw error;
      // Say where and why the turn failed, without the prompts, history, model
      // output or database messages that can carry account data.
      logError("assistant_turn_failed", new Error(turnSignal.aborted ? "Assistant deadline/cancellation" : "Assistant workflow failed"), {
        stage,
        intent,
        reason: assistantFailureReason(error, turnSignal.aborted),
        routeDecisions,
        rejectedFields: rejectedFields.length ? rejectedFields.join(",") : null,
      });
      return { code: turnSignal.aborted ? ASSISTANT_ERROR_CODES.TIMEOUT : ASSISTANT_ERROR_CODES.UNAVAILABLE, error: ASSISTANT_UNAVAILABLE_REPLY };
    } finally {
      turnSignal.removeEventListener("abort", onAbort);
    }
  };
}

export const assistantChat = createAssistantWorkflow();
