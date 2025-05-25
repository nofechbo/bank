import { Request, Response } from "express";
import { dbInstance } from "../db/prisma.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Email and password must be strings' });
        return;
    }
    
    const normalizedEmail = email.trim().toLowerCase();

    const user = await dbInstance.user.findUnique({
        where: { email: normalizedEmail }
    });
    

    if (!user || !await bcrypt.compare(password, user.password)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;        
    }
    if (!user.isVerified) {
        res.status(401).json({ error: 'Unverified user, please verify your email', unverified: true });
        return; 
    }

    //create JWT
    const token = jwt.sign(
        { email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
    );
      

    res.status(200).json({ message: 'Login successful', token });
}
