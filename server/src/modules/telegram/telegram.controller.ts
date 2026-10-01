import { Request, Response, NextFunction } from "express";
import { TelegramConfigService } from "./telegram.config.service";

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
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) throw new Error("botToken and chatId are required");

    await TelegramConfigService.saveTelegramConfig(userId, botToken, chatId);
    const data = await TelegramConfigService.getTelegramConfig(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
