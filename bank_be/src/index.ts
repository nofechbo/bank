import express from 'express';
import 'dotenv/config';
import { setupSwagger } from './swagger.js';
import userAuthRouter from "./routes/userAuth.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import { startPeriodicCleanUp } from './db/dbPeriodicCleanup.js';
import cors from 'cors';
import http from 'http';
import { setupWebSocketServer } from './websockets/websocketServer.js';

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());

//whitelist front only
const allowedOrigins = process.env.WHITE_LIST_URLS?.split(",") || [];
app.use(cors({
  origin: (origin, callback) => {
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

setupSwagger(app); //mounts swagger docs at /api-docs

app.use('/auth', userAuthRouter); //signup, login, verifyCode, logout
app.use('/dashboard', dashboardRouter); //balance, transfer

const server = http.createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running at port: ${PORT}`);
  console.log(`Swagger docs available at ${PORT}/api-docs`);
  startPeriodicCleanUp();
});