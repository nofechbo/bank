import jwt from 'jsonwebtoken';
import { DbUser } from '../db/prisma';
import { sendVerificationEmail } from "./sendVerificationEmail.js";

const localLink = `${process.env.FRONTEND_BASE_URL}/verify?token=`; 

export async function createAndSendVerificationLink(user: DbUser): Promise<boolean> {
    try {
        if (!user) throw Error("No user found");
        
        const token = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        const link = localLink + token;

        console.log(`(Link generated: ${link})`);
        await sendVerificationEmail(user.email, user.name, link);

        return true;
        
    } catch (err) {
        console.error('Failed to send verification code:', err);
        return false;
    }
}
