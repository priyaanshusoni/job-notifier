import cron from "node-cron";
import { fetchJSearchJobs } from "../scrapers/jsearch.scraper";
import { matchJobs } from "../matcher/matcher";
import { sendJobAlert } from "../notifier/telegram.service";

export async function runJobPipeline() {
  console.log(" Fetching jobs...");
  const jobs = await fetchJSearchJobs();
  console.log(` Fetched ${jobs.length} jobs`);

  console.log(" Scoring jobs with Gemini...");
  const matched = await matchJobs(jobs);
  console.log(` ${matched.length} jobs matched`);

  for (const job of matched) {
    await sendJobAlert(job);
    console.log(` Sent alert for: ${job.title} at ${job.company}`);
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
