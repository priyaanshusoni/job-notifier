import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CONFIG_PROVIDER } from "../../config";

const JWT_SECRET = CONFIG_PROVIDER.JWT_SECRET as string;

export async function signup(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already registered");

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    token,
    user: { id: user.id, email: user.email, isOnboarded: user.isOnboarded },
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    token,
    user: { id: user.id, email: user.email, isOnboarded: user.isOnboarded },
  };
}

export async function completeOnboarding(userId: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isOnboarded: true },
  });
  return { id: user.id, email: user.email, isOnboarded: user.isOnboarded };
}
