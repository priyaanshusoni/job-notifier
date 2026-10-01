import { prisma } from "../../lib/prisma";
import { encrypt, decrypt } from "../../lib/crypto";

async function saveTelegramConfig(
  userId: number,
  botToken: string,
  chatId: string,
) {
  const encryptedToken = encrypt(botToken);
  return prisma.telegramConfig.upsert({
    where: { userId },
    update: { botToken: encryptedToken, chatId },
    create: { userId, botToken: encryptedToken, chatId },
  });
}

async function getTelegramConfig(userId: number) {
  const config = await prisma.telegramConfig.findUnique({ where: { userId } });
  if (!config) return null;

  // Decrypt before returning — never expose encrypted blob to client
  return {
    id: config.id,
    chatId: config.chatId,
    // Mask the bot token for security — only show last 6 chars
    botToken: "***" + config.botToken.slice(-6),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

async function getTelegramConfigRaw(userId: number) {
  const config = await prisma.telegramConfig.findUnique({ where: { userId } });
  if (!config) return null;
  return { botToken: decrypt(config.botToken), chatId: config.chatId };
}

export const TelegramConfigService = {
  saveTelegramConfig,
  getTelegramConfig,
  getTelegramConfigRaw,
};
