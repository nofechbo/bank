import type { Request, Response } from "express";
import { chatService } from "../services/chat.service.js";

export async function chat(req: Request, res: Response): Promise<void> {
  const result = await chatService(req.body, req.ip);
  for (const [name, value] of Object.entries(result.headers ?? {})) res.setHeader(name, value);
  res.status(result.status).json(result.body);
}
