import { Request, Response, NextFunction } from "express";

export async function ErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error("Error:", err?.message);
  res.status(500).json({ success: false, message: err?.message });
}
