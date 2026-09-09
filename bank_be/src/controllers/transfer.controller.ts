import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { transferService } from "../services/transfer.service.js";

export async function transfer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await transferService(req.user, req.body);
  res.status(result.status).json(result.body);
}
