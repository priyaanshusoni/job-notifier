import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CONFIG_PROVIDER } from "../../config";
import { ApiError } from "../../lib/errors";
import { REFRESH_TOKEN_TTL_MS } from "../../lib/authCookie";

const JWT_SECRET = CONFIG_PROVIDER.JWT_SECRET as string;
const ACCESS_TOKEN_EXPIRY = "1d";

function toPublicUser(user: {
  id: number;
  email: string;
  isOnboarded: boolean;
}) {
  return { id: user.id, email: user.email, isOnboarded: user.isOnboarded };
}

function signAccessToken(user: { id: number; email: string }) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues an opaque refresh token and stores only its hash, so a DB leak
 * cannot be replayed and the server can revoke sessions at any time.
 */
async function issueRefreshToken(userId: number) {
  const token = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  // Opportunistic cleanup of this user's expired sessions
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
  return token;
}

/** Signup only creates the account — the user signs in afterwards. */
export async function signup(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw ApiError.conflict("Email already registered", "EMAIL_TAKEN");

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  return { user: toPublicUser(user) };
}

/** Login issues a 1-day access token + 7-day refresh token. */
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw ApiError.unauthorized("Invalid email or password");

  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user.id),
    user: toPublicUser(user),
  };
}

/**
 * Exchanges a valid refresh token for a fresh access token. The refresh
 * token itself stays valid until its 7-day expiry — after that the user
 * must log in again.
 */
export async function refreshAccessToken(refreshToken: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (!record) {
    throw ApiError.unauthorized("Session revoked. Please sign in again.");
  }
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: record.id } });
    throw ApiError.unauthorized("Session expired. Please sign in again.");
  }

  return {
    accessToken: signAccessToken(record.user),
    user: toPublicUser(record.user),
  };
}

/** Revokes the refresh token server-side so it cannot be used again. */
export async function revokeRefreshToken(refreshToken: string) {
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(refreshToken) },
  });
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.unauthorized();
  return toPublicUser(user);
}

export async function completeOnboarding(userId: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isOnboarded: true },
  });
  return toPublicUser(user);
}
