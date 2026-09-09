import { dbInstance } from "./prisma.js";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const CLEANUP_INTERVAL_MS = HOUR_MS;
// Login tokens last one hour; retain revocations beyond that lifetime.
const REVOKED_TOKEN_RETENTION_MS = 2 * HOUR_MS;
const UNVERIFIED_USER_LOG_AGE_MS = HOUR_MS;
const UNVERIFIED_USER_RETENTION_MS = 15 * MINUTE_MS;

export function startPeriodicCleanUp() {
    setInterval(async () => {
        const deletedTokens = await dbInstance.revokedToken.deleteMany({
            where: {
                revokedAt: { lt: new Date(Date.now() - REVOKED_TOKEN_RETENTION_MS) }
            }
        });
        if (deletedTokens) {
            console.log(`[cleanup] Revoked tokens deleted: ${deletedTokens.count}`);
        }
        

        const [expiredUsers] = await dbInstance.$transaction([
            dbInstance.user.findMany({
              where: {
                isVerified: false,
                createdAt: { lt: new Date(Date.now() - UNVERIFIED_USER_LOG_AGE_MS) }
              },
              select: { email: true }
            }),

            dbInstance.user.deleteMany({
              where: {
                isVerified: false,
                createdAt: { lt: new Date(Date.now() - UNVERIFIED_USER_RETENTION_MS) }
              }
            })
        ]);
        if (expiredUsers.length) {
            console.log(`[cleanup] Removed unverified users:`, expiredUsers.map(u => u.email));
        }

    }, CLEANUP_INTERVAL_MS);

    console.log("period DB cleanup is set for revokedTokens and non-verified users");
}
