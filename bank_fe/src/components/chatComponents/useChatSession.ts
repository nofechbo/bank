import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../config";
import {
  ASSISTANT_ENDPOINT,
  MAX_ERROR_CHARS,
  MILLISECONDS_PER_SECOND,
  RETRY_COUNTDOWN_TICK_MS,
  SESSION_EXPIRED_MESSAGE,
  SUPPORT_ENDPOINT,
  SUPPORT_STORAGE_KEY,
  UNAVAILABLE_MESSAGE,
  type ChatMessage,
  type ChatMode,
} from "./chat.consts";
import {
  assistantStorageKey,
  assistantInviteKey,
  isAssistantRoute,
  isExpiredToken,
  openingMessage,
  parseRetryAfterSeconds,
  readStoredMessages,
  removeStoredKey,
  submittedHistory,
  writeStoredMessages,
} from "./chat.helpers";

type Conversation = { key: string | null; messages: ChatMessage[] };

/** Owns the conversation for whichever mode the viewer is in. Public support
 * and the authenticated assistant never share stored messages, and a reply that
 * arrives after a logout or account change is discarded instead of displayed.
 */
export function useChatSession() {
  const { isLoggedIn, token, email, initialized } = useAuth();
  const { pathname } = useLocation();
  const accountKey = isLoggedIn && email && !isExpiredToken(token) ? assistantStorageKey(email) : null;
  // The assistant belongs to the authenticated pages. Public pages keep the public support chatbot, whether or not somebody is signed in.
  const mode: ChatMode = accountKey && isAssistantRoute(pathname) ? "assistant" : "support";
  const storageKey = mode === "assistant" && accountKey ? accountKey : SUPPORT_STORAGE_KEY;

  // key is null until authentication initialization completes, so a restored login never briefly shows or stores the public conversation.
  const [conversation, setConversation] = useState<Conversation>(() => ({
    key: null,
    messages: [openingMessage(mode)],
  }));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [rejectedToken, setRejectedToken] = useState<string | null>(null);
  const sessionExpired = mode === "assistant" && token !== null && rejectedToken === token;

  const activeKeyRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const accountKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialized) return;
    const previousAccountKey = accountKeyRef.current;
    accountKeyRef.current = accountKey;
    if (previousAccountKey && previousAccountKey !== accountKey) {
      removeStoredKey(previousAccountKey);
      removeStoredKey(assistantInviteKey(decodeURIComponent(previousAccountKey.slice(previousAccountKey.indexOf(":") + 1))));
    }
  }, [accountKey, initialized]);

  useLayoutEffect(() => {
    if (!initialized) return;
    generationRef.current += 1;
    activeKeyRef.current = storageKey;
    requestRef.current?.abort();
    requestRef.current = null;
    setConversation({ key: storageKey, messages: readStoredMessages(storageKey, mode) });
    setInput("");
    setSending(false);
  }, [initialized, mode, storageKey, token]);

  // Keep the conversation for this browser tab/session only.
  useEffect(() => {
    if (initialized && conversation.key === storageKey) writeStoredMessages(storageKey, conversation.messages);
  }, [conversation, initialized, storageKey]);

  // Count the wait down locally
  useEffect(() => {
    if (retryUntil === null) {
      setRetrySeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((retryUntil - Date.now()) / MILLISECONDS_PER_SECOND);
      if (remaining <= 0) {
        setRetryUntil(null);
        setRetrySeconds(0);
        return;
      }
      setRetrySeconds(remaining);
    };
    tick();
    const interval = setInterval(tick, RETRY_COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, [retryUntil]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const rateLimited = retryUntil !== null;
  const ready = initialized && conversation.key === storageKey;
  const canSend = ready && !sending && !rateLimited && !sessionExpired;

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      const requestKey = activeKeyRef.current;
      if (!text || !canSend || !requestKey || requestRef.current) return;
      const requestMode = mode;
      const previousMessages = conversation.messages;
      const history = submittedHistory(previousMessages);
      const generation = generationRef.current;
      const isCurrent = () => generationRef.current === generation && activeKeyRef.current === requestKey;
      // Every update is applied only to the conversation the request started in.
      const updateMessages = (updater: (current: ChatMessage[]) => ChatMessage[]) =>
        setConversation((current) =>
          current.key === requestKey ? { key: requestKey, messages: updater(current.messages) } : current,
        );
      const appendLocal = (notice: string) =>
        updateMessages((current) => [...current, { role: "assistant", text: notice, local: true }]);

      updateMessages((current) => [...current, { role: "user", text }]);
      setInput("");
      setSending(true);
      const controller = new AbortController();
      requestRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE_URL}${requestMode === "assistant" ? ASSISTANT_ENDPOINT : SUPPORT_ENDPOINT}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              // The token is sent to the private route only.
              ...(requestMode === "assistant" && token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message: text, history }),
          },
        );
        if (!isCurrent()) return;

        if (response.status === 429) {
          // Put the message back in the box so the user decides when to retry.
          updateMessages(() => previousMessages);
          setInput(text);
          setRetryUntil(
            Date.now() +
              parseRetryAfterSeconds(response.headers.get("Retry-After")) * MILLISECONDS_PER_SECOND,
          );
          return;
        }

        const data: { reply?: unknown; error?: unknown } = await response.json().catch(() => ({}));
        if (!isCurrent()) return;

        if (response.status === 401 && requestMode === "assistant") {
          setRejectedToken(token);
          appendLocal(SESSION_EXPIRED_MESSAGE);
          return;
        }
        if (!response.ok || typeof data.reply !== "string" || !data.reply.trim()) {
          appendLocal(
            !response.ok && typeof data.error === "string" && data.error.trim()
              ? data.error.trim().slice(0, MAX_ERROR_CHARS)
              : UNAVAILABLE_MESSAGE,
          );
          return;
        }
        const reply = data.reply.trim();
        updateMessages((current) => [...current, { role: "assistant", text: reply }]);
      } catch {
        if (controller.signal.aborted || !isCurrent()) return;
        appendLocal(UNAVAILABLE_MESSAGE);
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
        if (isCurrent()) setSending(false);
      }
    },
    [canSend, conversation.messages, mode, token],
  );

  const startNewChat = useCallback(() => {
    if (sending || !ready) return;
    setConversation((current) =>
      current.key ? { key: current.key, messages: [openingMessage(mode)] } : current,
    );
    setInput("");
    removeStoredKey(storageKey);
  }, [mode, sending, storageKey, ready]);

  return {
    mode,
    email,
    initialized,
    messages: ready ? conversation.messages : [openingMessage(mode)],
    input: ready ? input : "",
    setInput,
    sending,
    send,
    startNewChat,
    canSend,
    inputDisabled: !ready || rateLimited || sessionExpired,
    rateLimited,
    retrySeconds,
    sessionExpired,
  };
}
