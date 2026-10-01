import { Response, CookieOptions } from "express";
import { CONFIG_PROVIDER } from "../config";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

export const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const BASE_OPTIONS: CookieOptions = {
  httpOnly: true, // not readable by JS — XSS cannot steal the tokens
  secure: CONFIG_PROVIDER.IS_PROD,
  // Cross-domain frontend in prod needs "none"; "lax" is fine for localhost
  sameSite: CONFIG_PROVIDER.IS_PROD ? "none" : "lax",
};

// Refresh token is only ever needed by /auth/refresh and /auth/logout,
// so scope its cookie to /auth — it is never sent with normal API calls.
const REFRESH_PATH = "/auth";

export function setAccessCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...BASE_OPTIONS,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
}

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...BASE_OPTIONS,
    path: REFRESH_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...BASE_OPTIONS, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...BASE_OPTIONS, path: REFRESH_PATH });
}
