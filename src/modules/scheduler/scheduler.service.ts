import cron from "node-cron";
import { fetchJSearchJobs } from "../scrapers/jsearch.scraper";
import { matchJobs } from "../matcher/matcher";
import { sendJobAlert } from "../notifier/telegram.service";
import { prisma } from "../../lib/prisma";

export async function runJobPipeline() {
  console.log(" Fetching jobs...");
  const jobs = await fetchJSearchJobs();
  console.log(` Fetched ${jobs.length} jobs`);

  const seenJobs = await prisma.seenJob.findMany();

  console.log("seenJobs", seenJobs);

  const seenJobIds = new Set(seenJobs.map((job) => job?.id));

  const filteredJobs = jobs.filter((job: any) => !seenJobIds.has(job.id));

  console.log(" Scoring jobs with Gemini...");
  const matched = await matchJobs(filteredJobs);
  console.log(` ${matched.length} jobs matched`);

  for (const job of matched) {
    await sendJobAlert(job);
    console.log(` Sent alert for: ${job.title} at ${job.company}`);
    await prisma.seenJob.create({
      data: {
        id: job.id,
        source: job.source,
      },
    });
  }

  console.log("Pipeline complete!");
}

export function startScheduler() {
  cron.schedule("0 16 * * *", async () => {
    console.log("4PM — Running job pipeline...");
    await runJobPipeline();
  });

  console.log("Scheduler started — runs daily at 4PM");
}
