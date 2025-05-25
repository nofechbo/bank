import { Request, Response } from 'express';
import { dbInstance } from '../db/prisma.js';
import { SignupInput } from '../types/auth.types.js';
import { createAndSendVerificationLink } from '../utils/createAndSendVerificationLink.js';
import bcrypt from 'bcrypt';

export async function signup(req: Request, res: Response): Promise<void> {
    let { name, email, password, phone }: SignupInput = req.body;
        
    // normalize before passing
    const normalizedName = typeof name === 'string' ? name.trim() : name;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    //validations
    if (!await validateUserInfo(res, normalizedName, normalizedEmail, password, phone)) return;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser =  await dbInstance.user.create({
        data: {
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            balance: 0,
            isVerified: false
        }
    });

    if (!await createAndSendVerificationLink(newUser)) {
        res.status(500).json({ error: 'Failed to send verification code' });
        return;
    }

    // send response
    res.status(200).json({
        message: 'Verification link sent',
        validForMinutes: 15
    });
}

async function validateUserInfo(res: Response, name: string, email: string, password: string, phone: string): Promise<boolean> {
    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof phone !== 'string'
    ) {
        res.status(400).json({ error: "name, email, password and phone are required" });
        return false;
    }

    //validate name
    if (name.length === 0) {
        res.status(400).json({ error: 'Name cannot be empty' });
        return false;
    }
      
    //email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return false;
    }

    //password length
    if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return false;
    }
    
    //phone format + length
    if (!/^05\d{8}$/.test(phone)) {
        res.status(400).json({ error: 'Phone must be 10 digits and start with 05' });
        return false;
    }

    //check duplicate user
    const existingUser = await dbInstance.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        const errorMessage = 'Email is already registered';
        if (!existingUser.isVerified) {
            res.status(409).json({ error: errorMessage, unverified: true });
            return false;
        }
        res.status(409).json({ error: errorMessage });
        return false;
    }

    const existingPhone = await dbInstance.user.findUnique({
        where: { phone }
    });
    if (existingPhone) {
        res.status(409).json({ error: 'Phone is already registered' });
        return false;
    }

    return true;
}
