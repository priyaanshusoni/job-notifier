import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { ApiError } from "../../lib/errors";
import { NormalizedJob, SearchProfile } from "../../lib/types";
import { JobSource, profileSignature } from "../scrapers/source";
import { jsearchSource } from "../scrapers/jsearch.scraper";
import { prefilterJobs, annualSalaryInr } from "../matcher/prefilter";
import { scoreJobs, FeedbackExample } from "../matcher/matcher";
import {
  sendJobAlert,
  sendJobDigest,
  AlertJob,
} from "../notifier/telegram.service";
import { TelegramConfigService } from "../telegram/telegram.config.service";
import { Preference, User } from "../../generated/prisma/client";

// Register additional sources (e.g. Adzuna) here.
const JOB_SOURCES: JobSource[] = [jsearchSource];

const RUN_STALE_MS = 15 * 60 * 1000;

export interface PipelineStats {
  fetched: number;
  new: number;
  prefiltered: number;
  evaluated: number;
  matched: number;
  notified: number;
}

type EligibleUser = User & { preference: Preference };

function toSearchProfile(preference: Preference): SearchProfile {
  return {
    roles: preference.roles,
    locations: preference.location,
    recency: preference.searchRecency as SearchProfile["recency"],
  };
}

async function fetchFromAllSources(
  profile: SearchProfile,
): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(
    JOB_SOURCES.map((source) => source.search(profile)),
  );

  const jobs: NormalizedJob[] = [];
  const seen = new Set<string>();
  let successes = 0;

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error({ reason: result.reason?.message }, "Job source failed");
      continue;
    }
    successes++;
    for (const job of result.value) {
      // Cross-source dedup on external ID
      if (!seen.has(job.externalId)) {
        seen.add(job.externalId);
        jobs.push(job);
      }
    }
  }

  if (successes === 0) {
    throw ApiError.upstream("All job sources failed", "SOURCES_DOWN");
  }
  return jobs;
}

async function getRecentFeedback(userId: number): Promise<FeedbackExample[]> {
  const rows = await prisma.userJob.findMany({
    where: {
      userId,
      status: { in: ["saved", "applied", "dismissed", "not_relevant"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: { job: { select: { title: true, company: true } } },
  });
  return rows.map((r) => ({
    title: r.job.title,
    company: r.job.company,
    action: r.status,
  }));
}

function toAlertJob(job: {
  title: string;
  company: string;
  location: string;
  salaryRaw: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null;
  isRemote: boolean;
  source: string;
  applyLink: string;
  description: string;
  externalId: string;
  postedAt: Date | null;
  id: number;
  fetchedAt: Date;
}, score: number, reason: string): AlertJob {
  const annual = annualSalaryInr(job);
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    salary: annual ? `₹${annual.toLocaleString("en-IN")}/yr` : job.salaryRaw,
    source: job.source,
    score,
    reason,
    applyLink: job.applyLink,
  };
}

/**
 * Evaluate a batch of fetched jobs for one user and deliver alerts.
 * Ordering matters: Telegram config is validated before any AI spend,
 * and every job is persisted BEFORE its alert is sent so a crash can
 * never cause duplicate notifications.
 */
async function evaluateAndNotifyUser(
  user: EligibleUser,
  fetchedJobs: NormalizedJob[],
): Promise<PipelineStats> {
  const preference = user.preference;

  // 1. Validate the delivery channel before doing any expensive work.
  const telegramConfig = await TelegramConfigService.getTelegramConfigRaw(
    user.id,
  );
  if (!telegramConfig) {
    throw ApiError.badRequest(
      "Telegram is not configured (or the stored token could not be decrypted). Re-save your Telegram config.",
      "TELEGRAM_CONFIG_MISSING",
    );
  }

  // 2. Upsert canonical job records.
  const externalToDbId = new Map<string, number>();
  for (const job of fetchedJobs) {
    const record = await prisma.job.upsert({
      where: { externalId: job.externalId },
      update: {},
      create: {
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        salaryRaw: job.salaryRaw,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryPeriod: job.salaryPeriod,
        isRemote: job.isRemote,
        description: job.description,
        source: job.source,
        applyLink: job.applyLink,
        postedAt: job.postedAt,
      },
      select: { id: true, externalId: true },
    });
    externalToDbId.set(record.externalId, record.id);
  }

  // 3. Deduplicate: skip jobs this user has already been evaluated on.
  const existing = await prisma.userJob.findMany({
    where: { userId: user.id, jobId: { in: [...externalToDbId.values()] } },
    select: { jobId: true },
  });
  const alreadyEvaluated = new Set(existing.map((e) => e.jobId));
  const newJobs = fetchedJobs.filter(
    (j) => !alreadyEvaluated.has(externalToDbId.get(j.externalId)!),
  );

  // 4. Deterministic pre-filter (no AI cost).
  const { passed, rejected } = prefilterJobs(newJobs, preference);
  if (rejected.length > 0) {
    await prisma.userJob.createMany({
      data: rejected.map(({ job, reason }) => ({
        userId: user.id,
        jobId: externalToDbId.get(job.externalId)!,
        score: 0,
        reason,
        decision: "prefiltered",
      })),
      skipDuplicates: true,
    });
  }

  // 5. AI scoring, anchored by job ID.
  const feedbackExamples = await getRecentFeedback(user.id);
  const scored = await scoreJobs(passed, {
    preference,
    resumeSkills: user.resumeSkills,
    feedbackExamples,
  });

  let matched = 0;
  for (const s of scored) {
    const isMatch = s.score >= preference.minScore;
    if (isMatch) matched++;
    await prisma.userJob.upsert({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId: externalToDbId.get(s.externalId)!,
        },
      },
      update: {},
      create: {
        userId: user.id,
        jobId: externalToDbId.get(s.externalId)!,
        score: s.score,
        reason: s.reason,
        scoreBreakdown: s.breakdown as object,
        decision: isMatch ? "matched" : "below_threshold",
      },
    });
  }

  // 6. Deliver alerts — includes matches from previous runs whose send failed.
  const toNotify = await prisma.userJob.findMany({
    where: { userId: user.id, decision: "matched", notified: false },
    orderBy: { score: "desc" },
    take: preference.maxAlertsPerRun,
    include: { job: true },
  });

  let notified = 0;
  if (toNotify.length > 0) {
    const alerts = toNotify.map((uj) => toAlertJob(uj.job, uj.score, uj.reason));
    if (preference.digestMode) {
      await sendJobDigest(alerts, telegramConfig);
      await prisma.userJob.updateMany({
        where: { id: { in: toNotify.map((uj) => uj.id) } },
        data: { notified: true, notifiedAt: new Date() },
      });
      notified = toNotify.length;
    } else {
      for (let i = 0; i < toNotify.length; i++) {
        try {
          await sendJobAlert(alerts[i], telegramConfig);
          await prisma.userJob.update({
            where: { id: toNotify[i].id },
            data: { notified: true, notifiedAt: new Date() },
          });
          notified++;
        } catch (err) {
          // Left with notified=false — retried automatically on the next run.
          logger.error(
            { err, userJobId: toNotify[i].id },
            "Alert delivery failed; will retry next run",
          );
        }
      }
    }
  }

  return {
    fetched: fetchedJobs.length,
    new: newJobs.length,
    prefiltered: rejected.length,
    evaluated: scored.length,
    matched,
    notified,
  };
}

/** DB-backed lock: refuse to start when another run is already in flight. */
async function assertNoRunningPipeline(userId?: number) {
  const running = await prisma.pipelineRun.findFirst({
    where: {
      status: "running",
      startedAt: { gte: new Date(Date.now() - RUN_STALE_MS) },
      OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
    },
  });
  if (running) {
    throw ApiError.conflict(
      "A pipeline run is already in progress. Try again in a few minutes.",
      "PIPELINE_BUSY",
    );
  }
}

export async function runJobPipelineForUser(
  userId: number,
  trigger: "manual" | "cron" = "manual",
): Promise<PipelineStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preference: true },
  });
  if (!user?.preference) {
    throw ApiError.badRequest(
      "Set your job preferences before running the pipeline.",
      "PREFERENCES_MISSING",
    );
  }

  await assertNoRunningPipeline(userId);
  const run = await prisma.pipelineRun.create({
    data: { trigger, userId },
  });

  try {
    const jobs = await fetchFromAllSources(toSearchProfile(user.preference));
    const stats = await evaluateAndNotifyUser(user as EligibleUser, jobs);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: "success", stats: stats as object, finishedAt: new Date() },
    });
    return stats;
  } catch (err: any) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        error: err?.message ?? "Unknown error",
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function runJobPipeline() {
  await assertNoRunningPipeline();
  const run = await prisma.pipelineRun.create({ data: { trigger: "cron" } });

  try {
    const users = await prisma.user.findMany({
      where: { isOnboarded: true, preference: { isNot: null } },
      include: { preference: true },
    });
    const eligible = users as EligibleUser[];
    logger.info({ count: eligible.length }, "Cron pipeline: eligible users");

    // Fetch once per distinct search profile, then fan out to users.
    const jobsBySignature = new Map<string, NormalizedJob[]>();
    const aggregate: PipelineStats = {
      fetched: 0,
      new: 0,
      prefiltered: 0,
      evaluated: 0,
      matched: 0,
      notified: 0,
    };

    for (const user of eligible) {
      const profile = toSearchProfile(user.preference);
      const signature = profileSignature(profile);
      try {
        if (!jobsBySignature.has(signature)) {
          jobsBySignature.set(signature, await fetchFromAllSources(profile));
        }
        const stats = await evaluateAndNotifyUser(
          user,
          jobsBySignature.get(signature)!,
        );
        for (const key of Object.keys(aggregate) as (keyof PipelineStats)[]) {
          aggregate[key] += stats[key];
        }
        logger.info({ userId: user.id, stats }, "Pipeline user done");
      } catch (err) {
        logger.error({ err, userId: user.id }, "Pipeline failed for user");
      }
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        stats: aggregate as object,
        finishedAt: new Date(),
      },
    });
  } catch (err: any) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        error: err?.message ?? "Unknown error",
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

export function startScheduler() {
  // 12:00 PM IST daily — timezone-safe regardless of server location
  cron.schedule(
    "0 12 * * *",
    async () => {
      logger.info("Scheduled pipeline triggered");
      try {
        await runJobPipeline();
      } catch (err) {
        logger.error({ err }, "Scheduled pipeline failed");
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  logger.info("Scheduler started — runs daily at 12:00 PM IST");
}
