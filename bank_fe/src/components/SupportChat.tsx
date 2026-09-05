import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";
import { API_BASE_URL } from "../config";

type Message = { role: "user" | "assistant"; text: string };
const CHAT_SESSION_STORAGE_KEY = "tunabank-support-chat";
const MAX_HISTORY_MESSAGES = 6;
const INITIAL_CHAT_MESSAGE_TEXT =
  "Hi, I’m Tuna. I can explain how to use TunaBank and provide general banking information. I can’t access or change your account.";

const initialMessage: Message = {
  role: "assistant",
  text: INITIAL_CHAT_MESSAGE_TEXT,
};

function getSessionMessages(): Message[] {
  try {
    const saved = sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (!saved) return [initialMessage];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return [initialMessage];
    const messages = parsed.filter(
      (item): item is Message =>
        typeof item === "object" &&
        item !== null &&
        ((item as Message).role === "user" ||
          (item as Message).role === "assistant") &&
        typeof (item as Message).text === "string",
    );
    return messages.length ? messages : [initialMessage];
  } catch {
    return [initialMessage];
  }
}

export function SupportChat() {
  const isMobile = useMediaQuery("(max-width: 599.95px)");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(getSessionMessages);
  const [sending, setSending] = useState(false);
  const [showNewChatLabel, setShowNewChatLabel] = useState(false);
  const [visualViewport, setVisualViewport] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Track the visual viewport so the complete chat stays usable when the keyboard opens.
  useEffect(() => {
    if (!open || !isMobile || !window.visualViewport) {
      setVisualViewport(null);
      return;
    }
    const viewport = window.visualViewport;
    const update = () =>
      setVisualViewport({
        height: viewport.height,
        offsetTop: viewport.offsetTop,
      });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [isMobile, open]);

  // Keep the conversation for this browser tab/session only.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        CHAT_SESSION_STORAGE_KEY,
        JSON.stringify(messages),
      );
    } catch {
      // Chat still works when browser storage is unavailable.
    }
  }, [messages]);

  // Scroll to the bottom of the chat when new messages are added or the keyboard opens.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, open, sending, visualViewport]);

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setMessage("");
    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/support/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(1).slice(-MAX_HISTORY_MESSAGES),
        }),
      });
      const data: { reply?: string; error?: string } = await response.json();
      if (!response.ok || !data.reply)
        throw new Error(data.error || "Support chat is unavailable.");
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.reply! },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Tuna is currently unavailable. Please try again later.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = () => {
    if (sending) return;
    setMessages([initialMessage]);
    setMessage("");
    try {
      sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    } catch {
      // The state reset still works when browser storage is unavailable.
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        left: { xs: 12, sm: "auto" },
        right: { xs: "auto", sm: 20 },
        bottom: visualViewport ? "auto" : { xs: "auto", sm: 20 },
        top: visualViewport
          ? `${visualViewport.offsetTop + 12}px`
          : { xs: 12, sm: "auto" },
        zIndex: 2000,
      }}
    >
      {open ? (
        <Paper
          elevation={12}
          sx={{
            width: { xs: "calc(100vw - 24px)", sm: 380 },
            maxHeight: visualViewport
              ? `${visualViewport.height - 24}px`
              : "calc(100dvh - 24px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              p: { xs: 1.25, sm: 1.5 },
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight="bold">TunaBank support</Typography>
              <Typography variant="caption">
                Never share passwords or verification codes.
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                position: "relative",
              }}
            >
              {showNewChatLabel && (
                <Box
                  role="tooltip"
                  sx={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 40,
                    zIndex: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: "grey.900",
                    color: "common.white",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                    boxShadow: 2,
                  }}
                >
                  Start a new chat
                </Box>
              )}
              <IconButton
                aria-label="Start a new chat"
                onClick={startNewChat}
                onMouseEnter={() => setShowNewChatLabel(true)}
                onMouseLeave={() => setShowNewChatLabel(false)}
                onFocus={() => setShowNewChatLabel(true)}
                onBlur={() => setShowNewChatLabel(false)}
                color="inherit"
                sx={{ opacity: sending ? 0.55 : 1 }}
              >
                <RestartAltIcon />
              </IconButton>
              <IconButton
                aria-label="Close support chat"
                onClick={() => setOpen(false)}
                color="inherit"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Box
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            sx={{
              height: { xs: "min(48dvh, 360px)", sm: 320 },
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              p: { xs: 1.25, sm: 1.5 },
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {messages.map((item, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  px: 1.25,
                  py: 0.8,
                  borderRadius: 2,
                  bgcolor: item.role === "user" ? "primary.light" : "grey.100",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                <Typography variant="body2">{item.text}</Typography>
              </Box>
            ))}
            {sending && <CircularProgress size={20} sx={{ m: 1 }} />}
          </Box>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            sx={{
              display: "flex",
              p: { xs: 0.75, sm: 1 },
              gap: 1,
              borderTop: 1,
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder="Ask about TunaBank"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              inputProps={{ maxLength: 1500 }}
              disabled={sending}
            />
            <Button
              type="submit"
              variant="contained"
              aria-label="Send message"
              sx={{ minWidth: 44, px: 1 }}
              disabled={sending || !message.trim()}
            >
              <SendIcon />
            </Button>
          </Box>
        </Paper>
      ) : (
        <Tooltip title="Ask about TunaBank">
          {isMobile ? (
            <IconButton
              aria-label="Open TunaBank support chat"
              onClick={() => setOpen(true)}
              size="large"
              sx={{
                bgcolor: "#ffffff",
                color: "#0f766e",
                border: "1px solid #0f766e",
                boxShadow: 3,
                "&:hover": { bgcolor: "#f0fdfa", boxShadow: 4 },
              }}
            >
              <ChatBubbleOutlineIcon />
            </IconButton>
          ) : (
            <Button
              aria-label="Open TunaBank support chat"
              onClick={() => setOpen(true)}
              variant="contained"
              startIcon={<ChatBubbleOutlineIcon />}
              sx={{
                minHeight: 46,
                px: 2,
                borderRadius: 23,
                boxShadow: 4,
                fontWeight: 800,
                fontSize: "0.9rem",
                bgcolor: "#ffffff",
                color: "#0f766e",
                border: "1px solid #0f766e",
                "&:hover": { bgcolor: "#f0fdfa", boxShadow: 6 },
              }}
            >
              Chat with Tuna
            </Button>
          )}
        </Tooltip>
      )}
    </Box>
  );
}
