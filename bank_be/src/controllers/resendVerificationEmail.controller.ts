import type { Request, Response } from "express";
import { resendVerificationEmailService } from "../services/resendVerificationEmail.service.js";

export async function resendVerificationEmail(req: Request, res: Response): Promise<void> {
  const result = await resendVerificationEmailService(req.body);
  res.status(result.status).json(result.body);
}
