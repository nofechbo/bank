import type { ServiceResult } from "../types/service.types.js";
import { dbInstance } from "../db/prisma.js";
import jwt from 'jsonwebtoken';

export async function verifyEmailService(token: unknown): Promise<ServiceResult> {

  
  if (typeof token !== 'string') {
    return { status: 400, body: { error: 'Missing or invalid token' } };
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
  } catch {
    return { status: 400, body: { error: 'Invalid or expired token' } };
  }

  const email = payload.email;

  const pending = await dbInstance.user.findUnique({
    where: { email }
  });

  if (!pending) {
    return { status: 404, body: { error: 'No pending verification for this email' } };
  }
  if (pending.isVerified) {
    return { status: 200, body: { message: 'this email address has already been verified' } };
  }

  await dbInstance.user.update({
    where: { email },
    data: {
      isVerified: true,
      balance: Math.floor(Math.random() * 9000) + 1000
    }
  });

  return { status: 200, body: { message: 'Email verified, registration complete' } };
}
