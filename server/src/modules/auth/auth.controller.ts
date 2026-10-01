import { Request, Response, NextFunction } from "express";
import { signup, login, completeOnboarding } from "./auth.service";

export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      throw new Error("Email and password are required");
    const result = await signup(email, password);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      throw new Error("Email and password are required");
    const result = await login(email, password);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function completeOnboardingController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await completeOnboarding((req as any).user.userId);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}
