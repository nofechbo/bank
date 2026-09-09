import type { ServiceResult } from "../types/service.types.js";
import { dbInstance } from "../db/prisma.js";
import { createAndSendVerificationLink } from "../utils/createAndSendVerificationLink.js";

export async function resendVerificationEmailService(body: any): Promise<ServiceResult> {
    let { email } = body;

    if (typeof email !== 'string') {
        return { status: 400, body: { error: "email must be included" } };
    }
    //email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { status: 400, body: { error: 'Invalid email format' } };
    }

    email = email.trim().toLowerCase();
    const user = await dbInstance.user.findUnique({
        where: { email }
    });

    if (!user) {
        return { status: 404, body: { error: "email not found" } };
    }
    if (user.isVerified) {
        return { status: 404, body: { error: "email address is already verified" } };
    }

    if (!await createAndSendVerificationLink(user)) {
        return { status: 500, body: { error: 'Failed to send verification code' } };
    }

    // send response
    return { status: 200, body: {
        message: 'Verification link sent',
        validForMinutes: 15
    } };
}
