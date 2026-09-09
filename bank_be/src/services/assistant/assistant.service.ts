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
  ASSISTANT_TRANSFER_REPLY,
  ASSISTANT_UNRELATED_TASK_PATTERN,
} from "../../utils/assistantUtils/assistant.consts.js";
import { dbInstance } from "../../db/prisma.js";
import type { AssistantAccount, AssistantChatResponse, AssistantTransaction, AssistantSummary, AssistantRoute } from "../../types/assistant.types.js";
import { ASSISTANT_ERROR_CODES } from "../../types/assistant.types.js";
import type { ChatHistoryMessage } from "../../types/chat.types.js";
import { assistantRouteSchema, describeTransaction, describeTransactions, describeSummary, safeAssistantReply } from "../../utils/assistantUtils/assistant.helpers.js";
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

/** Configures model calls with tool binding, quota checks, output limits and
 * timeouts. This adapter proposes calls; the graph validates and executes them.
 */
export function createAssistantModel(tools: StructuredToolInterface[], requiredTool?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter is not configured for the banking assistant.");
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

  return async (account: AssistantAccount, message: string, history: ChatHistoryMessage[] = [], signal?: AbortSignal): Promise<AssistantChatResponse> => {
    if (isTunaMascotQuestion(message)) return { reply: TUNA_MASCOT_REPLY };
    if (activeAccounts.has(account.id) || activeAccounts.size >= ASSISTANT_MAX_CONCURRENT_TURNS)
      throw new ChatLimitError(ASSISTANT_BUSY_RETRY_SECONDS);
    activeAccounts.add(account.id);
    const timeout = AbortSignal.timeout(ASSISTANT_TURN_TIMEOUT_MS);
    const turnSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let pendingOperation: Promise<unknown> | undefined;

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
          const calls = result.tool_calls ?? [];
          if (calls.length !== 1 || calls[0].name !== ASSISTANT_ROUTE_TOOL || result.invalid_tool_calls?.length)
            throw new Error("Invalid assistant routing response");
          return { route: assistantRouteSchema.parse(calls[0].args) };
        })
        .addNode("lookup", async ({ route }) => {
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
            default: throw new Error("Unsupported data intent");
          }
          const selectedTool = tools.find(item => item.name === toolName);
          if (!selectedTool) throw new Error("Required banking tool unavailable");
          const toolCall = (selectedTool as StructuredToolInterface).invoke(args);
          pendingOperation = toolCall;
          const data = JSON.parse(await toolCall);
          turnSignal.throwIfAborted();
          // Render account facts from fresh tool data, not model-generated numbers.
          switch (route.intent) {
            case "balance": return { reply: `Your current balance is ${data.balance}.` };
            case "recent": return { reply: describeTransactions(data.transactions as AssistantTransaction[]) };
            case "transaction": return { reply: data.transaction ? describeTransaction(data.transaction as AssistantTransaction) : "That transaction is unavailable for your account." };
            case "summary": return { reply: describeSummary(data as AssistantSummary) };
            default: throw new Error("Unsupported data intent");
          }
        })
        .addNode("respond", ({ route }) => {
          turnSignal.throwIfAborted();
          if (route.intent === "out_of_scope") return { reply: OUT_OF_SCOPE_REPLY };
          if (route.intent === "transfer") {
            if (!route.amount || Number(route.amount) <= 0) return { reply: "What positive amount would you like to transfer? I can guide you; you will review and submit it on the Transfer page." };
            if (!route.recipient) return { reply: "What is the recipient's email address? No money has been sent." };
            return { reply: ASSISTANT_TRANSFER_REPLY };
          }
          return { reply: safeAssistantReply(route.reply ?? ASSISTANT_CLARIFY_REPLY) };
        })
        .addEdge(START, "plan")
        .addConditionalEdges("plan", ({ route }) => ["balance", "recent", "transaction", "summary"].includes(route.intent) ? "lookup" : "respond", ["lookup", "respond"])
        .addEdge("lookup", END)
        .addEdge("respond", END)
        .compile();
      const state = await graph.invoke({}, { recursionLimit: ASSISTANT_GRAPH_RECURSION_LIMIT, signal: turnSignal });
      return { reply: state.reply };
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
      // Do not log prompts, history, model output or database errors containing data.
      logError("assistant_turn_failed", new Error(turnSignal.aborted ? "Assistant deadline/cancellation" : "Assistant workflow failed"));
      return { code: turnSignal.aborted ? ASSISTANT_ERROR_CODES.TIMEOUT : ASSISTANT_ERROR_CODES.UNAVAILABLE, error: ASSISTANT_UNAVAILABLE_REPLY };
    } finally {
      turnSignal.removeEventListener("abort", onAbort);
    }
  };
}

export const assistantChat = createAssistantWorkflow();
