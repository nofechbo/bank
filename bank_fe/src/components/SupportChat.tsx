import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
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
import {
  ASSISTANT_INVITE_DISPLAY_MS,
  ASSISTANT_INVITE_TEXT,
  ASSISTANT_SUGGESTIONS,
  CHAT_MODE_THEME,
  MAX_INPUT_CHARS,
  SESSION_EXPIRED_NOTICE,
  rateLimitNotice,
} from "./chatComponents/chat.consts";
import {
  assistantInviteKey,
  markAssistantInviteShown,
  wasAssistantInviteShown,
} from "./chatComponents/chat.helpers";
import { useChatSession } from "./chatComponents/useChatSession";
import { useAuth } from "../contexts/AuthContext";

/** One floating chat with two authentication-dependent modes: public TunaBank support, and the authenticated banking assistant. **/
export function SupportChat() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isMobile = useMediaQuery("(max-width: 599.95px)");
  const [open, setOpen] = useState(false);
  const [showNewChatLabel, setShowNewChatLabel] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [visualViewport, setVisualViewport] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inviteKeyRef = useRef<string | null>(null);

  const {
    mode,
    email,
    initialized,
    messages,
    input,
    setInput,
    sending,
    send,
    startNewChat,
    canSend,
    inputDisabled,
    rateLimited,
    retrySeconds,
    sessionExpired,
    transferDraft,
    clearTransferDraft,
    logoutConfirmation,
    dismissLogoutConfirmation,
  } = useChatSession();
  const theme = CHAT_MODE_THEME[mode];
  const showSuggestions = mode === "assistant";

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

  useEffect(() => {
    if (!initialized || mode !== "assistant" || !email) {
      setInviteVisible(false);
      return;
    }
    const inviteKey = assistantInviteKey(email);
    inviteKeyRef.current = inviteKey;
    if (open) {
      markAssistantInviteShown(inviteKey);
      setInviteVisible(false);
      return;
    }
    if (wasAssistantInviteShown(inviteKey)) {
      setInviteVisible(false);
      return;
    }
    setInviteVisible(true);
    const timer = setTimeout(() => {
      markAssistantInviteShown(inviteKey);
      setInviteVisible(false);
    }, ASSISTANT_INVITE_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [email, initialized, mode, open]);

  const dismissInvite = () => {
    if (inviteKeyRef.current) markAssistantInviteShown(inviteKeyRef.current);
    setInviteVisible(false);
  };

  // Scroll to the bottom of the chat when new messages are added or the keyboard opens.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, open, sending, visualViewport]);

  const openChat = () => {
    dismissInvite();
    setOpen(true);
  };

  const notice = sessionExpired
    ? SESSION_EXPIRED_NOTICE
    : rateLimited
      ? rateLimitNotice(retrySeconds)
      : null;

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
              bgcolor: theme.headerBg,
              color: theme.headerColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight="bold">{theme.title}</Typography>
              <Typography variant="caption">{theme.caption}</Typography>
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
                aria-label={theme.closeLabel}
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
                  bgcolor: item.role === "user" ? theme.userBubble : "grey.100",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                <Typography variant="body2">{item.text}</Typography>
              </Box>
            ))}
            {sending && <CircularProgress size={20} sx={{ m: 1 }} />}
          </Box>
          {transferDraft && mode === "assistant" && (
            <Box sx={{ mx: { xs: 1.25, sm: 1.5 }, mb: 1, p: 1, border: "1px solid", borderColor: "secondary.light", borderRadius: 1, bgcolor: "secondary.50" }}>
              <Typography variant="body2">Draft: {transferDraft.amount} to {transferDraft.recipient}</Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  clearTransferDraft();
                  setOpen(false);
                  navigate("/transfer", { state: { transferDraft } });
                }}
                sx={{ mt: 0.75, bgcolor: theme.buttonAccent }}
              >
                Review transfer
              </Button>
            </Box>
          )}
          {logoutConfirmation && mode === "assistant" && (
            <Box sx={{ mx: { xs: 1.25, sm: 1.5 }, mb: 1, p: 1, border: "1px solid", borderColor: "warning.light", borderRadius: 1, bgcolor: "warning.50" }}>
              <Typography variant="body2">Sign out of TunaBank?</Typography>
              <Box sx={{ display: "flex", gap: 0.75, mt: 0.75 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => {
                    dismissLogoutConfirmation();
                    setOpen(false);
                    void logout();
                  }}
                >
                  Log out
                </Button>
                <Button size="small" onClick={dismissLogoutConfirmation}>Cancel</Button>
              </Box>
            </Box>
          )}
          {notice && (
            <Box
              role="status"
              aria-live="polite"
              sx={{
                px: { xs: 1.25, sm: 1.5 },
                py: 0.5,
                flexShrink: 0,
                color: "warning.dark",
                bgcolor: "warning.light",
              }}
            >
              <Typography variant="caption">{notice}</Typography>
            </Box>
          )}
          {showSuggestions && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.75,
                px: { xs: 1.25, sm: 1.5 },
                pb: 0.5,
                flexShrink: 0,
              }}
            >
              {ASSISTANT_SUGGESTIONS.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  variant="outlined"
                  onClick={() => void send(suggestion)}
                  disabled={!canSend}
                  sx={{ borderColor: theme.buttonAccent, color: theme.buttonAccent }}
                />
              ))}
            </Box>
          )}
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
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
              placeholder={theme.placeholder}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              inputProps={{ maxLength: MAX_INPUT_CHARS }}
              disabled={inputDisabled}
            />
            <Button
              type="submit"
              variant="contained"
              aria-label="Send message"
              sx={{ minWidth: 44, px: 1, ...(theme.sendBg ? { bgcolor: theme.sendBg } : {}) }}
              disabled={!canSend || !input.trim()}
            >
              <SendIcon />
            </Button>
          </Box>
        </Paper>
      ) : (
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          {inviteVisible && mode === "assistant" && (
            <Box
              role="status"
              sx={{
                position: "absolute",
                top: { xs: "calc(100% + 8px)", sm: "auto" },
                bottom: { xs: "auto", sm: "calc(100% + 8px)" },
                left: { xs: 0, sm: "auto" },
                right: { xs: "auto", sm: 0 },
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 1,
                borderRadius: 3,
                background: "linear-gradient(135deg, #ffffff, #f5f3ff)",
                color: theme.buttonAccent,
                border: `1px solid ${theme.buttonAccent}`,
                boxShadow: "0 10px 28px rgba(91, 33, 182, 0.26)",
                width: 276,
                maxWidth: "calc(100vw - 24px)",
                boxSizing: "border-box",
                transformOrigin: { xs: "top left", sm: "bottom right" },
                animation: "inviteEnter 380ms cubic-bezier(.2,.8,.2,1) both, inviteNudge 2.8s ease-in-out 1s 2",
                "@keyframes inviteEnter": {
                  from: { opacity: 0, transform: "translateY(8px) scale(.94)" },
                  to: { opacity: 1, transform: "translateY(0) scale(1)" },
                },
                "@keyframes inviteNudge": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-4px)" },
                },
                "@keyframes inviteWave": {
                  "0%, 60%, 100%": { transform: "rotate(0deg)" },
                  "10%, 30%, 50%": { transform: "rotate(16deg)" },
                  "20%, 40%": { transform: "rotate(-12deg)" },
                },
                "@media (prefers-reduced-motion: reduce)": { animation: "none" },
              }}
            >
              <Button
                onClick={openChat}
                sx={{ textAlign: "left", textTransform: "none", color: "inherit", p: 0.5, lineHeight: 1.25, flex: 1, minWidth: 0 }}
              >
                <Box component="span" sx={{ display: "block" }}>
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      display: "inline-block",
                      mr: 0.75,
                      fontSize: "1.2rem",
                      transformOrigin: "70% 70%",
                      animation: "inviteWave 1.8s ease-in-out .55s 2",
                      "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                    }}
                  >
                    👋
                  </Box>
                  <Typography component="span" variant="body2" fontWeight={900}>
                    Your assistant is here
                  </Typography>
                  <Typography component="span" variant="caption" sx={{ display: "block", mt: 0.35, color: "text.secondary", fontWeight: 700 }}>
                    {ASSISTANT_INVITE_TEXT}
                  </Typography>
                </Box>
              </Button>
              <IconButton
                aria-label="Dismiss assistant invitation"
                size="small"
                onClick={dismissInvite}
                sx={{ color: theme.buttonAccent, p: 0.25 }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Box>
          )}
          <Tooltip title={theme.tooltip}>
            {isMobile ? (
              <IconButton
                aria-label={theme.openLabel}
                onClick={openChat}
                size="large"
                sx={{
                  bgcolor: "#ffffff",
                  color: theme.buttonAccent,
                  border: `1px solid ${theme.buttonAccent}`,
                  boxShadow: 3,
                  "&:hover": { bgcolor: theme.buttonHover, boxShadow: 4 },
                }}
              >
                <ChatBubbleOutlineIcon />
              </IconButton>
            ) : (
              <Button
                aria-label={theme.openLabel}
                onClick={openChat}
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
                  color: theme.buttonAccent,
                  border: `1px solid ${theme.buttonAccent}`,
                  "&:hover": { bgcolor: theme.buttonHover, boxShadow: 6 },
                }}
              >
                {theme.buttonText}
              </Button>
            )}
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
