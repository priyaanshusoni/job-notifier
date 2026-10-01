import { prisma } from "../../lib/prisma";
import { PreferenceInput } from "../../lib/types";

async function setPreferences(userId: number, data: PreferenceInput) {
  return prisma.preference.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
}

async function getPreferences(userId: number) {
  return prisma.preference.findUnique({
    where: { userId },
  });
}

export const PreferenceService = { setPreferences, getPreferences };
