import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.types.js";
import { dbInstance } from "../db/prisma.js";
import jwt from 'jsonwebtoken';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);

        if (typeof decoded !== 'object' || !('email' in decoded)) {
            throw new Error('Invalid payload');
        }

        (req as AuthenticatedRequest).user = decoded as AuthenticatedRequest['user'];

        const revokedToken = await dbInstance.revokedToken.findUnique({
            where: { token }
        })

        if (revokedToken){
            throw new Error('Revoked token');
        }

        next();

    } catch(err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}