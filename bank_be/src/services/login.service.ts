import type { ServiceResult } from "../types/service.types.js";
import { dbInstance } from "../db/prisma.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_ALGORITHM } from '../types/auth.types.js';

export async function loginService(body: any): Promise<ServiceResult> {
    const { email, password } = body;

    if (typeof email !== 'string' || typeof password !== 'string') {
        return { status: 400, body: { error: 'Email and password must be strings' } };
    }
    
    const normalizedEmail = email.trim().toLowerCase();

    const user = await dbInstance.user.findUnique({
        where: { email: normalizedEmail }
    });
    

    if (!user || !await bcrypt.compare(password, user.password)) {
        return { status: 401, body: { error: 'Invalid credentials' } };        
    }
    if (!user.isVerified) {
        return { status: 401, body: { error: 'Unverified user, please verify your email', unverified: true } }; 
    }

    //create JWT
    const token = jwt.sign(
        { email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h', algorithm: JWT_ALGORITHM }
    );
      

    return { status: 200, body: { message: 'Login successful', token } };
}
