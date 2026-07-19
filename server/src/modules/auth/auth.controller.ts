import { Request, Response, NextFunction } from "express";
import {
  signup,
  login,
  refreshAccessToken,
  revokeRefreshToken,
  completeOnboarding,
  getMe,
} from "./auth.service";
import { credentialsSchema } from "../../lib/validation";
import {
  setAccessCookie,
  setRefreshCookie,
  clearAuthCookies,
  REFRESH_COOKIE,
} from "../../lib/authCookie";
import { ApiError } from "../../lib/errors";

/** Creates the account only — no session. The user signs in afterwards. */
export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await signup(email, password);
    res.status(201).json({
      success: true,
      user: result.user,
      message: "Account created — please sign in",
    });
  } catch (err) {
    next(err);
  }
}

/** Issues a 1-day access token + 7-day refresh token (httpOnly cookies). */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await login(email, password);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    next(err);
  }
}

/**
 * Exchanges the refresh token cookie for a fresh 1-day access token.
 * When the refresh token itself has expired (7 days), this returns 401
 * and the user must log in again.
 */
export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const refreshToken = (req as any).cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw ApiError.unauthorized("No session. Please sign in.");
    }
    const result = await refreshAccessToken(refreshToken);
    setAccessCookie(res, result.accessToken);
    res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    next(err);
  }
}

/** Revokes the refresh token server-side and clears both cookies. */
export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const refreshToken = (req as any).cookies?.[REFRESH_COOKIE];
    if (refreshToken) await revokeRefreshToken(refreshToken);
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

/** Restores the session from the httpOnly access cookie on page load. */
export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getMe((req as any).user.userId);
    res.status(200).json({ success: true, user });
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
