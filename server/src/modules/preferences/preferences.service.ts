import { prisma } from "../../lib/prisma";

interface PreferenceInput {
  roles: string[];
  skills: string[];
  location: string[];
  minSalary: number;
  experience: string;
  metaInfo: string;
}

async function setPreferences(userId: number, data: PreferenceInput) {
  return prisma.preference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

async function getPreferences(userId: number) {
  return prisma.preference.findUnique({
    where: { userId },
  });
}

export const PreferenceService = { setPreferences, getPreferences };
