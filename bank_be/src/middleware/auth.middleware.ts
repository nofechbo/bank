import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest, JWT_ALGORITHM } from "../types/auth.types.js";
import { dbInstance } from "../db/prisma.js";
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: [JWT_ALGORITHM] });

        if (typeof decoded !== 'object' || typeof decoded.email !== 'string' || !decoded.email.trim()
            || typeof decoded.exp !== 'number') {
            throw new Error('Invalid payload');
        }

        const revokedToken = await dbInstance.revokedToken.findUnique({
            where: { token }
        })

        if (revokedToken){
            throw new Error('Revoked token');
        }

        (req as AuthenticatedRequest).user = decoded as AuthenticatedRequest['user'];
        next();

    } catch(err) {
        logError('authentication_failed', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
