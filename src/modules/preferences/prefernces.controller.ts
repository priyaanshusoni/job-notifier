import { Request, Response, NextFunction } from "express";
import { PreferenceService } from "./preferences.service";

async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await PreferenceService.getPreferences();
    return res.status(200).json({
      message: "Preferences fetched successfully",
      data: response,
    });
  } catch (error) {}
}

async function setPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await PreferenceService.setPreferences(req?.body);

    return res.status(200).json({
      message: "Preferences updated successfully",
      data: response,
    });
  } catch (error) {}
}
export { getPreferences, setPreferences };
