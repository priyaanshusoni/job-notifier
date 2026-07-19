import { GoogleGenAI, Type } from "@google/genai";
import { CONFIG_PROVIDER } from "../../config";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { encrypt } from "../../lib/crypto";

const ai = new GoogleGenAI({ apiKey: CONFIG_PROVIDER.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash-lite";

/**
 * Search copilot: turn a plain-language description of an ideal job into a
 * structured preference suggestion. The result is only a proposal — the user
 * reviews it in the form before anything is saved.
 */
export async function suggestSearchProfile(text: string) {
  const result = await ai.models.generateContent({
    model: MODEL,
    contents: `A software developer in India describes their ideal job below.
Convert it into a structured job-search profile. Only include things they
actually said or clearly implied — do not invent preferences.

Description: """${text}"""`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          roles: { type: Type.ARRAY, items: { type: Type.STRING } },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          mustHaveSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          location: { type: Type.ARRAY, items: { type: Type.STRING } },
          workMode: {
            type: Type.STRING,
            description: "any | remote | hybrid | onsite",
          },
          minSalary: {
            type: Type.INTEGER,
            description: "Annual INR; 0 if not mentioned",
          },
          experience: {
            type: Type.STRING,
            description:
              'One of: "Fresher (0-1 years)", "1-3 years", "3-5 years", "5-8 years", "8+ years"; empty if unclear',
          },
          excludedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          metaInfo: {
            type: Type.STRING,
            description: "Anything relevant that does not fit other fields",
          },
        },
        required: ["roles", "skills", "location"],
      },
    },
  });

  try {
    return JSON.parse(result?.text ?? "{}");
  } catch {
    throw ApiError.upstream("AI could not parse your description; try rephrasing");
  }
}

/** Job fit explainer: honest evidence for and against a specific match. */
export async function explainJobFit(userId: number, userJobId: number) {
  const userJob = await prisma.userJob.findFirst({
    where: { id: userJobId, userId },
    include: {
      job: true,
      user: { include: { preference: true } },
    },
  });
  if (!userJob) throw ApiError.notFound("Job not found");
  const preference = userJob.user.preference;
  if (!preference) throw ApiError.badRequest("Preferences not set");

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: `You are advising a software developer in India about a job match.
Be honest and specific — cite evidence from the description. Never invent details.

Their profile:
- Target roles: ${preference.roles.join(", ")}
- Skills: ${preference.skills.join(", ")}
- Resume skills: ${userJob.user.resumeSkills.join(", ") || "not provided"}
- Locations: ${preference.location.join(", ")} (work mode: ${preference.workMode})
- Minimum salary: ₹${preference.minSalary}/year
- Experience: ${preference.experience}

The job (matched with score ${userJob.score}/100):
Title: ${userJob.job.title}
Company: ${userJob.job.company}
Location: ${userJob.job.location}${userJob.job.isRemote ? " (Remote)" : ""}
Salary: ${userJob.job.salaryRaw ?? "Not specified"}
Description: ${userJob.job.description.slice(0, 6000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pros: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Concrete evidence this job fits (max 5)",
          },
          cons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Concrete concerns or mismatches (max 5)",
          },
          missingSkills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Skills the job wants that the user lacks",
          },
          recommendation: {
            type: Type.STRING,
            description: "1-2 sentence bottom line: apply or skip, and why",
          },
        },
        required: ["pros", "cons", "missingSkills", "recommendation"],
      },
    },
  });

  try {
    return JSON.parse(result?.text ?? "{}");
  } catch (err) {
    logger.error({ err }, "Explain response parse failed");
    throw ApiError.upstream("AI explanation failed; try again");
  }
}

/**
 * Resume-aware ranking: store resume text encrypted, extract skills once via
 * Gemini, and feed only the extracted skills into scoring prompts.
 */
export async function saveResume(userId: number, resumeText: string) {
  const result = await ai.models.generateContent({
    model: MODEL,
    contents: `Extract the technical skills, tools, and frameworks this person has
actually used (not "willing to learn") from the resume below. Return each as a
short canonical name (e.g. "React", "PostgreSQL", "AWS").

Resume: """${resumeText.slice(0, 20000)}"""`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["skills"],
      },
    },
  });

  let skills: string[] = [];
  try {
    skills = JSON.parse(result?.text ?? "{}")?.skills ?? [];
  } catch {
    throw ApiError.upstream("Could not extract skills from resume; try again");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { resumeText: encrypt(resumeText), resumeSkills: skills.slice(0, 50) },
  });

  return { skills };
}

export async function getResumeStatus(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeText: true, resumeSkills: true },
  });
  return {
    hasResume: Boolean(user?.resumeText),
    skills: user?.resumeSkills ?? [],
  };
}

export async function deleteResume(userId: number) {
  await prisma.user.update({
    where: { id: userId },
    data: { resumeText: null, resumeSkills: [] },
  });
}
