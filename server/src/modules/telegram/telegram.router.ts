import { Router } from "express";
import { getTelegramConfig, saveTelegramConfig } from "./telegram.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const telegramRouter = Router();

telegramRouter.get("/config", authMiddleware, getTelegramConfig);
telegramRouter.post("/config", authMiddleware, saveTelegramConfig);

export { telegramRouter };
