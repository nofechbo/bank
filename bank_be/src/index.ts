import express from 'express';
import 'dotenv/config';
import { setupSwagger } from './swagger.js';
import userAuthRouter from "./routes/userAuth.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import { startPeriodicCleanUp } from './db/dbPeriodicCleanup.js';
import cors from 'cors';
import http from 'http';
import { setupWebSocketServer } from './websockets/websocketServer.js';
import healthcheckRouter from './routes/healthcheck.routes.js';
import chatRouter from './routes/chat.routes.js';
import assistantRouter from './routes/assistant.routes.js';
import { logError, logInfo } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3030;

if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

app.use(express.json());

//whitelist front only
const allowedOrigins = process.env.WHITE_LIST_URLS?.split(",") || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  // Retry-After is not readable cross-origin unless it is exposed. Both chat
  // modes use it for the "try again in X seconds" countdown.
  exposedHeaders: ["Retry-After"],
}));

setupSwagger(app); //mounts swagger docs at /api-docs

app.use('/auth', userAuthRouter); //signup, login, verifyCode, logout
app.use('/dashboard', dashboardRouter); //balance, transfer
app.use('/support', chatRouter);
app.use('/assistant', assistantRouter);
app.use(healthcheckRouter); //for docker

// A final safety net for errors thrown by any route or middleware. Route bodies
// and headers are intentionally not logged because they can contain secrets.
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('http_request_failed', error, { method: req.method, path: req.path });
  if (res.headersSent) return next(error);
  const candidate = error as { status?: unknown };
  const status = typeof candidate.status === 'number' && candidate.status >= 400 && candidate.status < 500
    ? candidate.status
    : 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again later.' : 'Request could not be completed.' });
});

app.use((req, res) => {
  logInfo('http_route_not_found', { method: req.method, path: req.path });
  res.status(404).json({ error: 'Route not found' });
});

const server = http.createServer(app);

process.on('unhandledRejection', reason => logError('process_unhandled_rejection', reason));
process.on('uncaughtException', error => logError('process_uncaught_exception', error));

// Setup WebSocket server
setupWebSocketServer(server);

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running at port: ${PORT}`);
  console.log(`Swagger docs available at ${PORT}/api-docs`);
  startPeriodicCleanUp();
});
