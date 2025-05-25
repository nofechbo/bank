import { Request, Response } from "express";
import { dbInstance } from "../db/prisma.js";
import jwt from 'jsonwebtoken';

export async function verifyEmail(req: Request, res: Response): Promise <void> {
  const { token } = req.query;
  
  if (typeof token !== 'string') {
    res.status(400).json({ error: 'Missing or invalid token' });
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
  } catch {
    res.status(400).json({ error: 'Invalid or expired token' });
    return;
  }

  const email = payload.email;

  const pending = await dbInstance.user.findUnique({
    where: { email }
  });

  if (!pending) {
    res.status(404).json({ error: 'No pending verification for this email' });
    return;
  }
  if (pending.isVerified) {
    res.status(200).json({ message: 'this email address has already been verified' });
    return;
  }

  await dbInstance.user.update({
    where: { email },
    data: {
      isVerified: true,
      balance: Math.floor(Math.random() * 9000) + 1000
    }
  });

  res.status(200).json({ message: 'Email verified, registration complete' });
}
