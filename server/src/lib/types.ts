export type { PreferenceInput } from "./validation";

/** A job normalized from any source into a single shape. */
export interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  salaryRaw: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null; // YEAR | MONTH | HOUR
  isRemote: boolean;
  description: string;
  source: string;
  applyLink: string;
  postedAt: Date | null;
}

/** What a job source needs to run a search. Built from user preferences. */
export interface SearchProfile {
  roles: string[];
  locations: string[];
  recency: "today" | "3days" | "week" | "month";
}

export interface ScoreBreakdown {
  roleFit: number; // 0-40
  skills: number; // 0-30
  location: number; // 0-15
  salary: number; // 0-10
  experience: number; // 0-5
}

export interface ScoredJob {
  externalId: string;
  score: number;
  reason: string;
  breakdown: ScoreBreakdown;
}
