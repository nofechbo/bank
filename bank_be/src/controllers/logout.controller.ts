import { Request, Response } from "express";
import { dbInstance } from "../db/prisma.js";

export async function logout(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader!.split(' ')[1];

    await dbInstance.revokedToken.create({
        data: {
            token,
            revokedAt: new Date()
        }
    });

    res.status(200).json({ message: 'Logged out successfully' });
}