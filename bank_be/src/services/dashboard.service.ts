import type { ServiceResult } from "../types/service.types.js";
import { dbInstance } from "../db/prisma.js";
import { AuthenticatedRequest } from "../types/auth.types.js";

export const getDashboardService = async (userIdentity: AuthenticatedRequest['user']): Promise<ServiceResult> => {
  if (!userIdentity) {
        return { status: 401, body: { message: 'Unauthorized' } };
    }
    
    const user = await dbInstance.user.findUnique({
        where: { email: userIdentity.email},
        include: {
            sentTransactions: {
              include: { toUser: true } // include the receiver's full user object
            },
            receivedTransactions: {
              include: { fromUser: true } // include the sender's full user object
            }
          }
    })
    if (!user) {
        return { status: 404, body: { message: 'User not found' } };
    }

    const transactions = [
        ...user.sentTransactions.map(t => ({
          type: "sent",
          email: t.toUser.email,
          amount: -t.amount,
          date: t.timeStamp,
        })),
        ...user.receivedTransactions.map(t => ({
          type: "received",
          email: t.fromUser.email,
          amount: t.amount,
          date: t.timeStamp,
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { status: 200, body: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinedAt: user.createdAt,
        balance: user.balance,
        transactions
    } };
}
