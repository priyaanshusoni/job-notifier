import { NormalizedJob } from "../../lib/types";
import { Preference } from "../../generated/prisma/client";

export interface PrefilterResult {
  passed: NormalizedJob[];
  rejected: { job: NormalizedJob; reason: string }[];
}

function includesAny(haystack: string, needles: string[]): string | null {
  const lower = haystack.toLowerCase();
  for (const needle of needles) {
    if (needle && lower.includes(needle.toLowerCase())) return needle;
  }
  return null;
}

/** Convert a source salary to annual INR where the period is known. */
export function annualSalaryInr(job: NormalizedJob): number | null {
  const amount = job.salaryMax ?? job.salaryMin;
  if (!amount) return null;
  switch (job.salaryPeriod) {
    case "YEAR":
      return amount;
    case "MONTH":
      return amount * 12;
    default:
      return null; // hourly/unknown period — too ambiguous to disqualify on
  }
}

/**
 * Deterministic first-pass filter. Cheap rules run before any AI call so
 * Gemini only scores plausible candidates. Rejections are recorded with a
 * reason so every evaluated job stays traceable.
 */
export function prefilterJobs(
  jobs: NormalizedJob[],
  preference: Preference,
): PrefilterResult {
  const passed: NormalizedJob[] = [];
  const rejected: { job: NormalizedJob; reason: string }[] = [];

  const wantsRemote = preference.workMode === "remote";
  const userLocations = preference.location.filter(
    (l) => l.toLowerCase() !== "remote",
  );
  const acceptsRemote =
    preference.workMode !== "onsite" &&
    (preference.location.some((l) => l.toLowerCase() === "remote") ||
      wantsRemote);

  for (const job of jobs) {
    const text = `${job.title} ${job.description}`;

    const excludedCompany = includesAny(job.company, preference.excludedCompanies);
    if (excludedCompany) {
      rejected.push({ job, reason: `Excluded company: ${excludedCompany}` });
      continue;
    }

    const excludedKeyword = includesAny(text, preference.excludedKeywords);
    if (excludedKeyword) {
      rejected.push({ job, reason: `Excluded keyword: ${excludedKeyword}` });
      continue;
    }

    const jobLooksRemote =
      job.isRemote || /\bremote\b/i.test(`${job.title} ${job.location}`);

    if (wantsRemote && !jobLooksRemote) {
      rejected.push({ job, reason: "Not remote; you only want remote roles" });
      continue;
    }

    if (!jobLooksRemote || !acceptsRemote) {
      const locationMatch =
        userLocations.length === 0 ||
        includesAny(job.location, userLocations) !== null ||
        userLocations.some((l) => l.toLowerCase() === "india");
      if (!locationMatch && !jobLooksRemote) {
        rejected.push({
          job,
          reason: `Location "${job.location}" is not in your preferred locations`,
        });
        continue;
      }
    }

    if (preference.mustHaveSkills.length > 0) {
      const skillHit = includesAny(text, preference.mustHaveSkills);
      if (!skillHit) {
        rejected.push({
          job,
          reason: `None of your must-have skills (${preference.mustHaveSkills.join(", ")}) mentioned`,
        });
        continue;
      }
    }

    const annual = annualSalaryInr(job);
    if (annual !== null && preference.minSalary > 0 && annual < preference.minSalary) {
      rejected.push({
        job,
        reason: `Salary ~₹${annual.toLocaleString("en-IN")}/yr is below your minimum`,
      });
      continue;
    }

    passed.push(job);
  }

  return { passed, rejected };
}
