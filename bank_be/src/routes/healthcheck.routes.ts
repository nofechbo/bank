import express from "express";
import { Request, Response } from "express";

const router = express.Router();

router.get('/healthcheck', healthcheck);

export default router;

function healthcheck(req: Request, res: Response) : void {
    res.status(200).send("OK");
}