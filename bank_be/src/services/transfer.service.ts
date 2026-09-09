import type { ServiceResult } from "../types/service.types.js";
import { AuthenticatedRequest } from "../types/auth.types.js";
import { dbInstance } from "../db/prisma.js";
import { sendDashboardUpdate } from "../websockets/websocketServer.js";

export async function transferService(userIdentity: AuthenticatedRequest['user'], body: any): Promise<ServiceResult> {
    if (!userIdentity) {
        return { status: 401, body: { message: 'Unauthorized' } };
    }

    const { toEmail, amount } = body;
    const normalizedToEmail = typeof toEmail === 'string' ? toEmail.trim().toLowerCase() : toEmail;

    //fetch sender and receiver
    const sender = await dbInstance.user.findUnique({ 
        where: { email: userIdentity.email }
    });
    const receiver = await dbInstance.user.findUnique({
        where: { email: normalizedToEmail }
    });

    if (!sender) {
        return { status: 404, body: { message: 'User not found' } };
    }      
    const validationError = validateTransactionInput(sender.email, receiver, normalizedToEmail, amount, sender.balance);
    if (validationError) return validationError;

    
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

    return { status: 200, body: {
        message: 'Transfer successful',
        to: normalizedToEmail,
        amount
    } }; 
}


function validateTransactionInput(
    fromEmail: string, 
    receiver: any,
    toEmail: string, 
    amount: number, 
    userBalance: any
): ServiceResult | null {

    if (typeof toEmail !== 'string' || typeof amount !== 'number') {
        return { status: 400, body: { error: "receiver's email and amount are required" } };
    }

    //verify receiver is registered
    if (fromEmail === toEmail) {
        return { status: 409, body: { error: 'cannot transfer funds to yourself' } };
    }
    if (!receiver || !receiver.isVerified) {
        return { status: 409, body: { error: "receiver's email is not registered" } };
    }

    //verify amount
    if (amount <= 0) {
        return { status: 409, body: { error: 'Amount must be greater than zero' } };
    }

    //verify funds
    if (userBalance < amount) {
        return { status: 409, body: { error: 'insufficient funds' } };
    }

    return null;
}
