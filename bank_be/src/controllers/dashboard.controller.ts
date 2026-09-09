import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { getDashboardService } from "../services/dashboard.service.js";

export async function getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDashboardService(req.user);
  res.status(result.status).json(result.body);
}
