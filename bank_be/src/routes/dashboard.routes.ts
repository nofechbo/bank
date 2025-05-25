import express from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { transfer } from "../controllers/transfer.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get('', authMiddleware, getDashboard);
router.post('/transfer', authMiddleware, transfer);

export default router;