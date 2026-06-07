import cron from "node-cron";
import { fetchJSearchJobs } from "../scrapers/jsearch.scraper";
import { matchJobs } from "../matcher/matcher";
import { sendJobAlert } from "../notifier/telegram.service";
import { TelegramConfigService } from "../telegram/telegram.config.service";
import { prisma } from "../../lib/prisma";

export async function runJobPipelineForUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preference: true, telegramConfig: true },
  });

  if (!user?.preference || !user?.telegramConfig) {
    throw new Error("User is missing preference or telegram config");
  }

  const jobs = await fetchJSearchJobs();

  console.log("jobs came as ", jobs);

  const seenJobs = await prisma.seenJob.findMany({
    where: { userId },
    select: { id: true },
  });
  const seenIds = new Set(seenJobs.map((j) => j.id));
  const newJobs = jobs.filter((job: any) => !seenIds.has(job.id));

  const matched = await matchJobs(newJobs, user.preference);

  const telegramConfig =
    await TelegramConfigService.getTelegramConfigRaw(userId);
  if (!telegramConfig) {
    console.error(`User ${userId}: Could not decrypt telegram config`);
    return;
  }

  for (const job of matched) {
    await sendJobAlert(job, telegramConfig);
    await prisma.seenJob.create({
      data: {
        id: job.id,
        title: job.title,
        company: job.company,
        score: job.relevanceScore,
        reason: job.relevanceReason,
        source: job.source,
        applyLink: job.applyLink,
        userId,
      },
    });
  }

  return { total: jobs.length, new: newJobs.length, matched: matched.length };
}

export async function runJobPipeline() {
  const users = await prisma.user.findMany({
    where: { isOnboarded: true },
    include: { preference: true, telegramConfig: true },
  });

  const eligible = users.filter((u) => u.preference && u.telegramConfig);
  console.log(`Pipeline: ${eligible.length} eligible users`);

  await Promise.all(
    eligible.map(async (user) => {
      try {
        const stats = await runJobPipelineForUser(user.id);
        console.log(`User ${user.id} done:`, stats);
      } catch (err) {
        console.error(`Pipeline failed for user ${user.id}:`, err);
      }
    }),
  );
}

export function startScheduler() {
  // 12:00 PM IST daily — timezone-safe regardless of server location
  cron.schedule(
    "0 12 * * *",
    async () => {
      console.log("Scheduled pipeline triggered");
      await runJobPipeline();
    },
    { timezone: "Asia/Kolkata" },
  );

  console.log("Scheduler started — runs daily at 12:00 PM IST");
}
