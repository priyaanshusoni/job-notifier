import { GoogleGenAI, Type } from "@google/genai";
import { CONFIG_PROVIDER } from "../../config";
import { logger } from "../../lib/logger";
import { NormalizedJob, ScoreBreakdown, ScoredJob } from "../../lib/types";
import { Preference } from "../../generated/prisma/client";
import { annualSalaryInr } from "./prefilter";

const ai = new GoogleGenAI({ apiKey: CONFIG_PROVIDER.GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash-lite";
const BATCH_SIZE = 8;

export interface FeedbackExample {
  title: string;
  company: string;
  action: string; // saved | applied | dismissed | not_relevant
}

export interface ScoringContext {
  preference: Preference;
  resumeSkills?: string[];
  feedbackExamples?: FeedbackExample[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          jobId: {
            type: Type.STRING,
            description: "The exact id of the job being scored, copied verbatim",
          },
          roleFit: { type: Type.INTEGER, description: "0-40: title/role alignment" },
          skills: { type: Type.INTEGER, description: "0-30: skills overlap" },
          location: { type: Type.INTEGER, description: "0-15: location/work-mode fit" },
          salary: { type: Type.INTEGER, description: "0-10: compensation fit (5 if unknown)" },
          experience: { type: Type.INTEGER, description: "0-5: seniority fit" },
          reason: {
            type: Type.STRING,
            description: "One or two sentences, written for the job seeker",
          },
        },
        required: ["jobId", "roleFit", "skills", "location", "salary", "experience", "reason"],
      },
    },
  },
  required: ["scores"],
};

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value ?? 0)));
}

function buildPrompt(jobs: NormalizedJob[], ctx: ScoringContext): string {
  const p = ctx.preference;

  const jobDetails = jobs
    .map((job) => {
      const annual = annualSalaryInr(job);
      return `
<job id="${job.externalId}">
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}${job.isRemote ? " (Remote)" : ""}
Salary: ${annual ? `~₹${annual}/year` : (job.salaryRaw ?? "Not specified")}
Description: ${job.description.slice(0, 4000)}
</job>`;
    })
    .join("\n");

  const resumeBlock = ctx.resumeSkills?.length
    ? `\nSkills extracted from the user's resume (weigh these as demonstrated experience): ${ctx.resumeSkills.join(", ")}`
    : "";

  const feedbackBlock = ctx.feedbackExamples?.length
    ? `\nRecent feedback from this user (align scoring with these signals):\n${ctx.feedbackExamples
        .map((f) => `- ${f.action.toUpperCase()}: "${f.title}" at ${f.company}`)
        .join("\n")}`
    : "";

  return `You are a job relevance scorer for a software developer in India.

User preferences:
- Target roles: ${p.roles.join(", ")}
- Skills: ${p.skills.join(", ")}
${p.mustHaveSkills.length ? `- Must-have skills: ${p.mustHaveSkills.join(", ")}` : ""}
- Preferred locations: ${p.location.join(", ")} (work mode: ${p.workMode})
- Minimum salary: ₹${p.minSalary}/year
- Experience level: ${p.experience}
${p.metaInfo ? `- Additional preferences: ${p.metaInfo}` : ""}${resumeBlock}${feedbackBlock}

Score EACH job below using this rubric (score components independently):
- roleFit (0-40): how closely the job title and responsibilities match the target roles
- skills (0-30): overlap between required skills and the user's skills
- location (0-15): location and work-mode fit
- salary (0-10): compensation vs minimum; give 5 when salary is not stated
- experience (0-5): seniority match

Hard rules:
- A job outside India that is not remote-friendly must score 0 on location.
- A clearly different profession (e.g. sales, mechanical engineering) must score under 10 on roleFit.
- Copy each job's id verbatim into jobId. Return exactly one entry per job.
- Write "reason" for the job seeker: concrete and specific, not generic praise.

Jobs:
${jobDetails}`;
}

async function scoreBatch(
  jobs: NormalizedJob[],
  ctx: ScoringContext,
): Promise<ScoredJob[]> {
  const result = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(jobs, ctx),
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const parsed = JSON.parse(result?.text ?? "{}");
  const entries: any[] = Array.isArray(parsed?.scores) ? parsed.scores : [];

  const validIds = new Set(jobs.map((j) => j.externalId));
  const scored: ScoredJob[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!validIds.has(entry?.jobId) || seen.has(entry.jobId)) {
      logger.warn({ jobId: entry?.jobId }, "Gemini returned unknown/duplicate jobId");
      continue;
    }
    seen.add(entry.jobId);

    const breakdown: ScoreBreakdown = {
      roleFit: clamp(entry.roleFit, 40),
      skills: clamp(entry.skills, 30),
      location: clamp(entry.location, 15),
      salary: clamp(entry.salary, 10),
      experience: clamp(entry.experience, 5),
    };
    scored.push({
      externalId: entry.jobId,
      score:
        breakdown.roleFit +
        breakdown.skills +
        breakdown.location +
        breakdown.salary +
        breakdown.experience,
      reason: String(entry.reason ?? "").slice(0, 500),
      breakdown,
    });
  }

  const missing = jobs.filter((j) => !seen.has(j.externalId));
  if (missing.length > 0) {
    logger.warn(
      { missing: missing.map((j) => j.externalId) },
      "Gemini omitted jobs from scoring response",
    );
  }

  return scored;
}

/**
 * Score jobs with Gemini in small batches, anchored by job ID so a dropped or
 * reordered entry can never attach a score to the wrong job. A failed batch
 * throws only if every batch fails; partial results are returned otherwise.
 */
export async function scoreJobs(
  jobs: NormalizedJob[],
  ctx: ScoringContext,
): Promise<ScoredJob[]> {
  if (jobs.length === 0) return [];

  const batches: NormalizedJob[][] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    batches.push(jobs.slice(i, i + BATCH_SIZE));
  }

  const results: ScoredJob[] = [];
  let failures = 0;

  for (const batch of batches) {
    try {
      results.push(...(await scoreBatch(batch, ctx)));
    } catch (err) {
      failures++;
      logger.error({ err, batchSize: batch.length }, "Gemini scoring batch failed");
    }
  }

  if (failures === batches.length) {
    throw new Error("AI scoring failed for all job batches");
  }

  return results;
}
