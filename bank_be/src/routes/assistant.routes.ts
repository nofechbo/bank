import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { chatWithAssistant } from "../controllers/assistant.controller.js";

const router = express.Router();
router.post("/chat", authMiddleware, chatWithAssistant);
export default router;
