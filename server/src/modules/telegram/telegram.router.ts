import { Router } from "express";
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConfig,
} from "./telegram.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const telegramRouter = Router();

telegramRouter.get("/config", authMiddleware, getTelegramConfig);
telegramRouter.post("/config", authMiddleware, saveTelegramConfig);
telegramRouter.post("/test", authMiddleware, testTelegramConfig);

export { telegramRouter };
