import type { Request, Response } from "express";
import { logoutService } from "../services/logout.service.js";

export async function logout(req: Request, res: Response): Promise<void> {
  const result = await logoutService(req.headers.authorization);
  res.status(result.status).json(result.body);
}
