import { randomUUID } from "node:crypto";
import { dbInstance } from "../db/prisma.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import type { ServiceResult } from "../types/service.types.js";
import { sendVideoCallInvite } from "../websockets/websocketServer.js";

export async function startVideoCallService(
  userIdentity: AuthenticatedRequest["user"],
  body: unknown,
): Promise<ServiceResult> {
  if (!userIdentity) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const toEmail = normalizeEmail(body);
  if (!toEmail) {
    return { status: 400, body: { error: "A valid recipient email is required" } };
  }

  if (toEmail === userIdentity.email) {
    return { status: 409, body: { error: "You cannot start a video call with yourself" } };
  }

  const recipient = await dbInstance.user.findUnique({
    where: { email: toEmail },
    select: { email: true, isVerified: true },
  });

  if (!recipient || !recipient.isVerified) {
    return { status: 404, body: { error: "Recipient is not a verified registered user" } };
  }

  const roomName = `bank-${randomUUID()}`;
  const delivered = sendVideoCallInvite(recipient.email, {
    roomName,
    callerEmail: userIdentity.email,
  });

  return { status: 200, body: { roomName, delivered } };
}

function normalizeEmail(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const { toEmail } = body as { toEmail?: unknown };
  if (typeof toEmail !== "string") return null;

  const normalizedEmail = toEmail.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ? normalizedEmail : null;
}
