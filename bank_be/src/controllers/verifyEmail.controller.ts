import type { Request, Response } from "express";
import { verifyEmailService } from "../services/verifyEmail.service.js";

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const result = await verifyEmailService(req.query.token);
  res.status(result.status).json(result.body);
}
