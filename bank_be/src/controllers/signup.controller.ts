import type { Request, Response } from "express";
import { signupService } from "../services/signup.service.js";

export async function signup(req: Request, res: Response): Promise<void> {
  const result = await signupService(req.body);
  res.status(result.status).json(result.body);
}
