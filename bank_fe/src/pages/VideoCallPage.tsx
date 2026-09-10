import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

interface JitsiApi {
  dispose: () => void;
}

interface JitsiApiConstructor {
  new (domain: string, options: Record<string, unknown>): JitsiApi;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiApiConstructor;
  }
}

interface VideoCallLocationState {
  returnTo?: string;
  videoCallDraft?: { toEmail: string; amount: string };
}

const rawJitsiDomain = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
const jitsiDomain = rawJitsiDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export default function VideoCallPage() {
  const { roomName } = useParams();
  const { email } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const meetingContainer = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [loadError, setLoadError] = useState("");
  const [meetingReady, setMeetingReady] = useState(false);

  const state = location.state as VideoCallLocationState | null;
  const returnTo = state?.returnTo === "/transfer" ? "/transfer" : "/dashboard";

  useEffect(() => {
    if (!roomName || !email || !meetingContainer.current) {
      setLoadError("This video call is missing its meeting details.");
      return;
    }

    let cancelled = false;
    const scriptId = "jitsi-external-api";
    let scriptElement: HTMLScriptElement | null = null;

    const startMeeting = () => {
      if (cancelled || !meetingContainer.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI(jitsiDomain, {
        roomName,
        parentNode: meetingContainer.current,
        width: "100%",
        height: "100%",
        userInfo: { email },
      });
      setMeetingReady(true);
    };
    const handleLoadError = () => {
      if (!cancelled) setLoadError("Unable to load Jitsi.");
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (window.JitsiMeetExternalAPI) {
      startMeeting();
    } else if (existingScript) {
      scriptElement = existingScript;
      scriptElement.addEventListener("load", startMeeting, { once: true });
      scriptElement.addEventListener("error", handleLoadError, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://${jitsiDomain}/external_api.js`;
      script.async = true;
      script.addEventListener("load", startMeeting, { once: true });
      script.addEventListener("error", handleLoadError, { once: true });
      document.head.appendChild(script);
      scriptElement = script;
    }

    return () => {
      cancelled = true;
      scriptElement?.removeEventListener("load", startMeeting);
      scriptElement?.removeEventListener("error", handleLoadError);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [email, roomName]);

  const leaveCall = () => {
    navigate(returnTo, {
      state: returnTo === "/transfer" ? { videoCallDraft: state?.videoCallDraft } : undefined,
      replace: true,
    });
  };

  return (
    <Box sx={{ height: "100vh", bgcolor: "#1A2038", display: "flex", flexDirection: "column", p: { xs: 1, sm: 2 }, gap: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
        <Typography variant="h6">Video Call</Typography>
        <Button color="error" variant="contained" onClick={leaveCall}>Leave Call</Button>
      </Box>
      {loadError ? (
        <Alert severity="error">{loadError}</Alert>
      ) : (
        <Box sx={{ position: "relative", flex: 1, minHeight: 0, bgcolor: "black" }}>
          <Box ref={meetingContainer} sx={{ width: "100%", height: "100%" }} />
          {!meetingReady && (
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "white" }}>
              <CircularProgress color="inherit" />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
