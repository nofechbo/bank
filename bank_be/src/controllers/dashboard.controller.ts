import { Response, RequestHandler } from "express";
import { dbInstance } from "../db/prisma.js";
import { AuthenticatedRequest } from "../types/auth.types.js";

export const getDashboard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    
    const user = await dbInstance.user.findUnique({
        where: { email: req.user.email},
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
        res.status(404).json({ message: 'User not found' });
        return;
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

    res.status(200).json({
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinedAt: user.createdAt,
        balance: user.balance,
        transactions
    });
}