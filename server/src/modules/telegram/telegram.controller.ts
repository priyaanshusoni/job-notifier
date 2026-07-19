import { Request, Response, NextFunction } from "express";
import { TelegramConfigService } from "./telegram.config.service";
import { telegramConfigSchema } from "../../lib/validation";
import { ApiError } from "../../lib/errors";
import { sendTestMessage } from "../notifier/telegram.service";

export async function getTelegramConfig(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user.userId;
    const data = await TelegramConfigService.getTelegramConfig(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function saveTelegramConfig(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user.userId;
    const { botToken, chatId } = telegramConfigSchema.parse(req.body);

    await TelegramConfigService.saveTelegramConfig(userId, botToken, chatId);
    const data = await TelegramConfigService.getTelegramConfig(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Sends a real message so "Connected" in the UI means actually connected. */
export async function testTelegramConfig(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user.userId;
    const config = await TelegramConfigService.getTelegramConfigRaw(userId);
    if (!config) {
      throw ApiError.badRequest(
        "No Telegram config saved yet",
        "TELEGRAM_CONFIG_MISSING",
      );
    }
    await sendTestMessage(config);
    res.status(200).json({ success: true, message: "Test message sent" });
  } catch (err) {
    next(err);
  }
}
