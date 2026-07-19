import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const preferenceSchema = z.object({
  roles: z.array(z.string().trim().min(1)).min(1, "Select at least one role"),
  skills: z.array(z.string().trim().min(1)).min(1, "Select at least one skill"),
  mustHaveSkills: z.array(z.string().trim().min(1)).default([]),
  location: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one location"),
  workMode: z.enum(["any", "remote", "hybrid", "onsite"]).default("any"),
  minSalary: z.number().int().min(0),
  experience: z.string().trim().min(1),
  metaInfo: z.string().nullish(),
  excludedKeywords: z.array(z.string().trim().min(1)).default([]),
  excludedCompanies: z.array(z.string().trim().min(1)).default([]),
  minScore: z.number().int().min(0).max(100).default(75),
  maxAlertsPerRun: z.number().int().min(1).max(50).default(10),
  digestMode: z.boolean().default(true),
  searchRecency: z.enum(["today", "3days", "week", "month"]).default("today"),
});

export type PreferenceInput = z.infer<typeof preferenceSchema>;

export const telegramConfigSchema = z.object({
  botToken: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]{35,}$/, "Invalid bot token format"),
  chatId: z.string().regex(/^-?\d+$/, "Chat ID should be a number"),
});

export const jobStatusSchema = z.object({
  status: z.enum(["new", "saved", "dismissed", "applied", "not_relevant"]),
});

export const searchCopilotSchema = z.object({
  text: z.string().trim().min(10, "Describe your ideal job in a sentence or two"),
});

export const resumeSchema = z.object({
  resumeText: z.string().trim().min(50, "Resume text looks too short").max(30000),
});
