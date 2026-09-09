import type { ServiceResult } from "../types/service.types.js";
import { dbInstance } from "../db/prisma.js";

export async function logoutService(authorization: string | undefined): Promise<ServiceResult> {
    const authHeader = authorization;
    const token = authHeader!.split(' ')[1];

    await dbInstance.revokedToken.create({
        data: {
            token,
            revokedAt: new Date()
        }
    });

    return { status: 200, body: { message: 'Logged out successfully' } };
}
