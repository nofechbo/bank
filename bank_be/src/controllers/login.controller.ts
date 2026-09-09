import type { Request, Response } from "express";
import { loginService } from "../services/login.service.js";

export async function login(req: Request, res: Response): Promise<void> {
  const result = await loginService(req.body);
  res.status(result.status).json(result.body);
}
