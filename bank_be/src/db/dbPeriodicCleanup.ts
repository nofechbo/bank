import { dbInstance } from "./prisma.js";

export function startPeriodicCleanUp() {
    setInterval(async () => {
        const deletedTokens = await dbInstance.revokedToken.deleteMany({
            where: {
                revokedAt: { lt: new Date(Date.now() - 1 * 60 *1000) }
            }
        });
        if (deletedTokens) {
            console.log(`[cleanup] Revoked tokens deleted: ${deletedTokens.count}`);
        }
        

        const [expiredUsers] = await dbInstance.$transaction([
            dbInstance.user.findMany({
              where: {
                isVerified: false,
                createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }
              },
              select: { email: true }
            }),

            dbInstance.user.deleteMany({
              where: {
                isVerified: false,
                createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) }
              }
            })
        ]);
        if (expiredUsers.length) {
            console.log(`[cleanup] Removed unverified users:`, expiredUsers.map(u => u.email));
        }

    }, 60 * 60 * 1000); //every 1hr

    console.log("period DB cleanup is set for revokedTokens and non-verified users");
}