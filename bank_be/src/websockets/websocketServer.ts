import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import type { Server } from 'http';

const clientMap = new Map<string, WebSocket>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const { type, token } = JSON.parse(message.toString());

        if (type === 'auth' && token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
          clientMap.set(decoded.email, ws);
        }
      } catch (err) {
        console.error('Invalid WebSocket auth message:', err);
      }
    });

    ws.on('close', () => {
      for (const [userId, client] of clientMap.entries()) {
        if (client === ws) {
          clientMap.delete(userId);
          break;
        }
      }
    });
  });
}

export function sendDashboardUpdate(userEmail: string) {
  const ws = clientMap.get(userEmail);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'dashboard:update' }));
  }
}
