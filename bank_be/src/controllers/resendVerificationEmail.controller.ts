import { Request, Response } from "express";
import { dbInstance } from "../db/prisma.js";
import { createAndSendVerificationLink } from "../utils/createAndSendVerificationLink.js";

export async function resendVerificationEmail(req: Request, res: Response): Promise<void> {
    let { email } = req.body;

    if (typeof email !== 'string') {
        res.status(400).json({ error: "email must be included" });
        return;
    }
    //email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }

    email = email.trim().toLowerCase();
    const user = await dbInstance.user.findUnique({
        where: { email }
    });

    if (!user) {
        res.status(404).json({ error: "email not found" });
        return;
    }
    if (user.isVerified) {
        res.status(404).json({ error: "email address is already verified" });
        return;
    }

    if (!await createAndSendVerificationLink(user)) {
        res.status(500).json({ error: 'Failed to send verification code' });
        return;
    }

    // send response
    res.status(200).json({
        message: 'Verification link sent',
        validForMinutes: 15
    });
}
