import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CONFIG_PROVIDER } from "../config";

const JWT_SECRET = CONFIG_PROVIDER.JWT_SECRET as string;

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Primary: httpOnly access cookie. Fallback: Bearer header (API clients).
  const authHeader = req.headers.authorization;
  const token =
    (req as any).cookies?.accessToken ??
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
