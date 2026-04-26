import { prisma } from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";

async function setPreferences(data: Prisma.PreferenceCreateInput) {
  try {
    return prisma.preference.upsert({
      where: {
        id: 1,
      },
      update: data,
      create: {
        id: 1,
        ...data,
      },
    });
  } catch (error) {
    console.error(error);
  }
}

async function getPreferences() {
  try {
    return prisma.preference.findUnique({
      where: { id: 1 },
    });
  } catch (error) {
    console.error(error);
  }
}

export const PreferenceService = { setPreferences, getPreferences };
