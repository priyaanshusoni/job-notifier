import { prisma } from "../../lib/prisma";
import { encrypt, decrypt } from "../../lib/crypto";
import { logger } from "../../lib/logger";

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

  // Mask the REAL token (decrypt first), never expose the encrypted blob.
  let masked = "***";
  try {
    masked = "***" + decrypt(config.botToken).slice(-6);
  } catch (err) {
    logger.error({ err, userId }, "Failed to decrypt telegram token for masking");
  }

  return {
    id: config.id,
    chatId: config.chatId,
    botToken: masked,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

async function getTelegramConfigRaw(userId: number) {
  const config = await prisma.telegramConfig.findUnique({ where: { userId } });
  if (!config) return null;
  try {
    return { botToken: decrypt(config.botToken), chatId: config.chatId };
  } catch (err) {
    logger.error({ err, userId }, "Failed to decrypt telegram token");
    return null;
  }
}

export const TelegramConfigService = {
  saveTelegramConfig,
  getTelegramConfig,
  getTelegramConfigRaw,
};
