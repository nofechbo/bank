import { useEffect } from "react";
import { API_BASE_URL } from "../../config";

interface UseDashboardSocketOptions {
    token: string | null;
    userEmail: string | null;
    onUpdate: () => void;
    onVideoCallInvite?: (invitation: VideoCallInvitation) => void;
}

export interface VideoCallInvitation {
    roomName: string;
    callerEmail: string;
}

export function useDashboardSocket({ token, userEmail, onUpdate, onVideoCallInvite}: UseDashboardSocketOptions) {
    
    useEffect(() => {
        if (!token || !userEmail) return;

        let ws: WebSocket | null = null;
        let isActive = true;

        try {
            ws = new WebSocket(API_BASE_URL.replace(/^http/, "ws"));

            ws.onopen = () => {
                if (isActive && token) {
                    ws!.send(JSON.stringify({ type: "auth", token }));
                }
            };
    
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === "dashboard:update") {
                        onUpdate();
                    }
                    if (
                        message.type === "video-call:invite"
                        && typeof message.roomName === "string"
                        && typeof message.callerEmail === "string"
                    ) {
                        onVideoCallInvite?.({ roomName: message.roomName, callerEmail: message.callerEmail });
                    }
                } catch (e) {
                    console.warn("Ignored malformed WebSocket message:", event.data, e);
                }
            };
    
            ws.onerror = (err) => console.error("WebSocket error:", err);
            ws.onclose = () => console.log("WebSocket connection closed");
        } catch (err) {
            console.warn("WebSocket setup failed (likely token/email not ready):", err);

        }


        return () => {
            isActive = false;
            if (ws) ws.close();
        };
    }, [token, userEmail, onUpdate, onVideoCallInvite]);
}
