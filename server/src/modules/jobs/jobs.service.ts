import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";

export interface HistoryFilters {
  minScore?: number;
  source?: string;
  status?: string;
  decision?: string;
  limit?: number;
}

async function getHistory(userId: number, filters: HistoryFilters) {
  const rows = await prisma.userJob.findMany({
    where: {
      userId,
      // Pre-filtered jobs are noise in the history view unless asked for
      decision: filters.decision ?? { in: ["matched", "below_threshold"] },
      ...(filters.minScore !== undefined ? { score: { gte: filters.minScore } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.source
        ? { job: { source: { contains: filters.source, mode: "insensitive" } } }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { score: "desc" }],
    take: Math.min(filters.limit ?? 100, 200),
    include: { job: true },
  });

  return rows.map((uj) => ({
    id: uj.id,
    score: uj.score,
    reason: uj.reason,
    scoreBreakdown: uj.scoreBreakdown,
    decision: uj.decision,
    status: uj.status,
    notified: uj.notified,
    seenAt: uj.createdAt,
    title: uj.job.title,
    company: uj.job.company,
    location: uj.job.location,
    salary: uj.job.salaryRaw,
    isRemote: uj.job.isRemote,
    source: uj.job.source,
    applyLink: uj.job.applyLink,
    postedAt: uj.job.postedAt,
  }));
}

async function updateStatus(userId: number, userJobId: number, status: string) {
  const userJob = await prisma.userJob.findFirst({
    where: { id: userJobId, userId },
  });
  if (!userJob) throw ApiError.notFound("Job not found");

  return prisma.userJob.update({
    where: { id: userJobId },
    data: { status },
  });
}

/** Next 12:00 IST occurrence, for the dashboard status panel. */
function nextScheduledRun(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const next = new Date(nowIst);
  next.setUTCHours(12, 0, 0, 0);
  if (next <= nowIst) next.setUTCDate(next.getUTCDate() + 1);
  return new Date(next.getTime() - IST_OFFSET_MS);
}

async function getPipelineStatus(userId: number) {
  const [lastRun, running] = await Promise.all([
    prisma.pipelineRun.findFirst({
      where: {
        status: { in: ["success", "error"] },
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.pipelineRun.findFirst({
      where: {
        status: "running",
        startedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        OR: [{ userId }, { userId: null }],
      },
    }),
  ]);

  return {
    running: Boolean(running),
    lastRun: lastRun
      ? {
          trigger: lastRun.trigger,
          status: lastRun.status,
          stats: lastRun.stats,
          error: lastRun.error,
          startedAt: lastRun.startedAt,
          finishedAt: lastRun.finishedAt,
        }
      : null,
    nextScheduledAt: nextScheduledRun(),
  };
}

export const JobsService = { getHistory, updateStatus, getPipelineStatus };
