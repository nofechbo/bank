import type { ServiceResult } from "../types/service.types.js";
import { dbInstance } from '../db/prisma.js';
import { SignupInput } from '../types/auth.types.js';
import { createAndSendVerificationLink } from '../utils/createAndSendVerificationLink.js';
import bcrypt from 'bcrypt';

export async function signupService(body: SignupInput): Promise<ServiceResult> {
    let { name, email, password, phone }: SignupInput = body;
        
    // normalize before passing
    const normalizedName = typeof name === 'string' ? name.trim() : name;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    //validations
    const validationError = await validateUserInfo(normalizedName, normalizedEmail, password, phone);
    if (validationError) return validationError;

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
        return { status: 500, body: { error: 'Failed to send verification code' } };
    }

    // send response
    return { status: 200, body: {
        message: 'Verification link sent',
        validForMinutes: 15
    } };
}

async function validateUserInfo( name: string, email: string, password: string, phone: string): Promise<ServiceResult | null> {
    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof phone !== 'string'
    ) {
        return { status: 400, body: { error: "name, email, password and phone are required" } };
    }

    //validate name
    if (name.length === 0) {
        return { status: 400, body: { error: 'Name cannot be empty' } };
    }
      
    //email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { status: 400, body: { error: 'Invalid email format' } };
    }

    //password length
    if (password.length < 6) {
        return { status: 400, body: { error: 'Password must be at least 6 characters' } };
    }
    
    //phone format + length
    if (!/^05\d{8}$/.test(phone)) {
        return { status: 400, body: { error: 'Phone must be 10 digits and start with 05' } };
    }

    //check duplicate user
    const existingUser = await dbInstance.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        const errorMessage = 'Email is already registered';
        if (!existingUser.isVerified) {
            return { status: 409, body: { error: errorMessage, unverified: true } };
        }
        return { status: 409, body: { error: errorMessage } };
    }

    const existingPhone = await dbInstance.user.findUnique({
        where: { phone }
    });
    if (existingPhone) {
        return { status: 409, body: { error: 'Phone is already registered' } };
    }

    return null;
}
