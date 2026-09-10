import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { startVideoCallService } from "../services/videoCall.service.js";

export async function startVideoCall(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await startVideoCallService(req.user, req.body);
  res.status(result.status).json(result.body);
}
