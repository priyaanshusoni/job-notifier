import { Request, Response, NextFunction } from "express";
import { PreferenceService } from "./preferences.service";
import { preferenceSchema } from "../../lib/validation";

async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const data = await PreferenceService.getPreferences(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function setPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const input = preferenceSchema.parse(req.body);
    const data = await PreferenceService.setPreferences(userId, input);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { getPreferences, setPreferences };
