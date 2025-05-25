import { Router } from "express";
import { signup } from "../controllers/signup.controller.js";
import { verifyEmail } from "../controllers/verifyEmail.controller.js";
import { login } from "../controllers/login.controller.js";
import { authMiddleware } from '../middleware/auth.middleware.js';
import { logout } from "../controllers/logout.controller.js";
import { resendVerificationEmail } from "../controllers/resendVerificationEmail.controller.js";

const router = Router();

router.post('/signup', signup);
router.get('/verify', verifyEmail);
router.post('/resend', resendVerificationEmail);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);

export default router;