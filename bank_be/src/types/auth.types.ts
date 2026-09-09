import { Request } from "express";

export const JWT_ALGORITHM = 'HS256';

export interface SignupInput {
    name: string,
    email: string;
    password: string;
    phone: string;
}

export interface AuthenticatedRequest extends Request {
    user?: {
      email: string;
      iat: number;
      exp: number;
    };
}
