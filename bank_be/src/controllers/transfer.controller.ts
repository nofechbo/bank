import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.types.js";
import { dbInstance } from "../db/prisma.js";
import { sendDashboardUpdate } from "../websockets/websocketServer.js";

export async function transfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const { toEmail, amount } = req.body;
    const normalizedToEmail = typeof toEmail === 'string' ? toEmail.trim().toLowerCase() : toEmail;

    //fetch sender and receiver
    const sender = await dbInstance.user.findUnique({ 
        where: { email: req.user.email }
    });
    const receiver = await dbInstance.user.findUnique({
        where: { email: normalizedToEmail }
    });

    if (!sender) {
        res.status(404).json({ message: 'User not found' });
        return;
    }      
    if (!validateTransactionInput(res, sender.email, receiver, normalizedToEmail, amount, sender.balance)) return;

    
    //transfer
    const transferDate = new Date();

    await dbInstance.$transaction([
        dbInstance.user.update({
            where: {id: sender.id },
            data: { balance: sender.balance.toNumber() - amount }
        }),
        dbInstance.user.update({
            where: { id: receiver!.id },
            data: { balance: receiver!.balance.toNumber() + amount }
        }),

        dbInstance.bankTransaction.create({
            data: {
                fromUserId: sender.id,
                toUserId: receiver!.id,
                amount: amount,
                timeStamp: transferDate
            }
        })   
    ]);

    sendDashboardUpdate(sender.email);
    sendDashboardUpdate(receiver!.email);

    res.status(200).json({
        message: 'Transfer successful',
        to: normalizedToEmail,
        amount
    }); 
}


function validateTransactionInput(
    res: Response, 
    fromEmail: string, 
    receiver: any,
    toEmail: string, 
    amount: number, 
    userBalance: any
): boolean {

    if (typeof toEmail !== 'string' || typeof amount !== 'number') {
        res.status(400).json({ error: "receiver's email and amount are required" });
        return false;
    }

    //verify receiver is registered
    if (fromEmail === toEmail) {
        res.status(409).json({ error: 'cannot transfer funds to yourself' });
        return false;
    }
    if (!receiver || !receiver.isVerified) {
        res.status(409).json({ error: "receiver's email is not registered" });
        return false;
    }

    //verify amount
    if (amount <= 0) {
        res.status(409).json({ error: 'Amount must be greater than zero' });
        return false;
    }

    //verify funds
    if (userBalance < amount) {
        res.status(409).json({ error: 'insufficient funds' });
        return false;
    }

    return true;
}
