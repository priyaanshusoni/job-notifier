import axios from "axios";
import { CONFIG_PROVIDER } from "../../config";
import { ApiError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { NormalizedJob, SearchProfile } from "../../lib/types";
import { JobSource } from "./source";

const RECENCY_MAP: Record<SearchProfile["recency"], string> = {
  today: "today",
  "3days": "3days",
  week: "week",
  month: "month",
};

function buildQuery(profile: SearchProfile): string {
  // JSearch works best with "role in location" free-form queries.
  const roles = profile.roles.slice(0, 3).join(" OR ");
  const nonRemote = profile.locations.filter(
    (l) => l.toLowerCase() !== "remote",
  );
  const location = nonRemote.length > 0 ? nonRemote[0] : "India";
  return `${roles} jobs in ${location}`;
}

function normalizeSalaryPeriod(period: string | null | undefined): string | null {
  if (!period) return null;
  const upper = period.toUpperCase();
  return ["YEAR", "MONTH", "HOUR"].includes(upper) ? upper : null;
}

export const jsearchSource: JobSource = {
  name: "jsearch",

  async search(profile: SearchProfile): Promise<NormalizedJob[]> {
    const query = buildQuery(profile);

    let response;
    try {
      response = await axios.get("https://jsearch.p.rapidapi.com/search", {
        params: {
          query,
          date_posted: RECENCY_MAP[profile.recency],
          country: "in",
          num_pages: "3",
        },
        headers: {
          "X-RapidAPI-Key": CONFIG_PROVIDER.JSEARCH_API_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        timeout: 30_000,
      });
    } catch (error: any) {
      logger.error(
        { query, error: error?.response?.data ?? error?.message },
        "JSearch request failed",
      );
      throw ApiError.upstream(
        "Job search provider (JSearch) is unavailable right now",
        "JSEARCH_ERROR",
      );
    }

    const jobs = response.data?.data;
    logger.info({ query, count: jobs?.length ?? 0 }, "JSearch results");
    if (!Array.isArray(jobs)) return [];

    return jobs
      .filter((job: any) => job?.job_id && job?.job_title)
      .map(
        (job: any): NormalizedJob => ({
          externalId: job.job_id,
          title: job.job_title,
          company: job.employer_name ?? "Unknown",
          location: `${job.job_city ?? ""} ${job.job_country ?? ""}`.trim(),
          salaryRaw: job.job_min_salary
            ? `${job.job_min_salary} - ${job.job_max_salary}`
            : null,
          salaryMin: job.job_min_salary ?? null,
          salaryMax: job.job_max_salary ?? null,
          salaryPeriod: normalizeSalaryPeriod(job.job_salary_period),
          isRemote: Boolean(job.job_is_remote),
          description: job.job_description ?? "",
          source: job.job_publisher ?? "JSearch",
          applyLink: job.job_apply_link ?? "",
          postedAt: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : null,
        }),
      );
  },
};
