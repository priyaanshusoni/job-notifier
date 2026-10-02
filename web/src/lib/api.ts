import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  timeout: 60_000, // pipeline trigger can take a while
  // Tokens live in httpOnly cookies set by the server — sent automatically
  withCredentials: true,
});

// Endpoints where a 401 is a final answer (wrong credentials / expired
// refresh token) — never trigger the silent-refresh flow for these.
const NO_REFRESH_URLS = ["/auth/login", "/auth/signup", "/auth/refresh", "/auth/logout"];

// Single in-flight refresh shared by all concurrent 401s, so ten failing
// requests trigger one /auth/refresh call, not ten.
let refreshPromise: Promise<unknown> | null = null;

function sessionExpired(): never {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  throw new Error("Session expired. Please sign in again.");
}

// Normalize errors + silent access-token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    // No response at all → network problem
    if (!error.response) {
      throw new Error(
        "Cannot reach the server. Check your connection and try again.",
      );
    }

    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };
    const noRefresh = NO_REFRESH_URLS.some((u) => original?.url?.startsWith(u));

    // Access token expired (1 day): exchange the refresh token (7 days) for
    // a new one and transparently retry the original request once.
    if (error.response.status === 401 && !noRefresh && !original._retried) {
      original._retried = true;
      try {
        refreshPromise ??= axios
          .post(
            "/auth/refresh",
            {},
            { baseURL: axiosInstance.defaults.baseURL, withCredentials: true },
          )
          .finally(() => {
            refreshPromise = null;
          });
        await refreshPromise;
      } catch {
        // Refresh token expired or revoked → the 7-day window is over
        sessionExpired();
      }
      return axiosInstance(original);
    }

    throw new Error(error.response.data?.message || "Request failed");
  },
);

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------
export const api = {
  auth: {
    signup: async (email: string, password: string) =>
      (
        await axiosInstance.post<{ user: User }>("/auth/signup", {
          email,
          password,
        })
      ).data,
    login: async (email: string, password: string) =>
      (
        await axiosInstance.post<{ user: User }>("/auth/login", {
          email,
          password,
        })
      ).data,
    /** Restores the session from the httpOnly cookie (page load). */
    me: async () => (await axiosInstance.get<{ user: User }>("/auth/me")).data,
    /** Exchanges the 7-day refresh token for a fresh 1-day access token. */
    refresh: async () =>
      (await axiosInstance.post<{ user: User }>("/auth/refresh")).data,
    logout: async () =>
      (await axiosInstance.post<{ success: boolean }>("/auth/logout")).data,
    completeOnboarding: async () =>
      (await axiosInstance.patch<{ user: User }>("/auth/complete-onboarding"))
        .data,
  },

  preferences: {
    get: async () =>
      (await axiosInstance.get<{ data: Preference | null }>("/preferences"))
        .data,
    save: async (data: PreferenceInput) =>
      (await axiosInstance.post<{ data: Preference }>("/preferences", data))
        .data,
  },

  telegram: {
    get: async () =>
      (
        await axiosInstance.get<{ data: TelegramConfig | null }>(
          "/telegram/config",
        )
      ).data,
    save: async (botToken: string, chatId: string) =>
      (
        await axiosInstance.post<{ data: TelegramConfig }>("/telegram/config", {
          botToken,
          chatId,
        })
      ).data,
    test: async () =>
      (
        await axiosInstance.post<{ success: boolean; message: string }>(
          "/telegram/test",
        )
      ).data,
  },

  jobs: {
    trigger: async () =>
      (
        await axiosInstance.post<{ success: boolean; stats: JobStats }>(
          "/jobs/trigger",
        )
      ).data,
    history: async (filters?: JobHistoryFilters) =>
      (
        await axiosInstance.get<{ data: JobItem[] }>("/jobs/history", {
          params: filters,
        })
      ).data,
    setStatus: async (id: number, status: JobStatus) =>
      (
        await axiosInstance.patch<{ data: JobItem }>(`/jobs/${id}/status`, {
          status,
        })
      ).data,
    pipelineStatus: async () =>
      (
        await axiosInstance.get<{ data: PipelineStatus }>(
          "/jobs/pipeline/status",
        )
      ).data,
    explain: async (id: number) =>
      (
        await axiosInstance.post<{ data: JobExplanation }>(
          `/jobs/${id}/explain`,
        )
      ).data,
  },

  ai: {
    suggestSearchProfile: async (text: string) =>
      (
        await axiosInstance.post<{ data: Partial<PreferenceInput> }>(
          "/ai/search-profile",
          { text },
        )
      ).data,
    saveResume: async (resumeText: string) =>
      (
        await axiosInstance.post<{ data: { skills: string[] } }>("/ai/resume", {
          resumeText,
        })
      ).data,
    resumeStatus: async () =>
      (
        await axiosInstance.get<{
          data: { hasResume: boolean; skills: string[] };
        }>("/ai/resume")
      ).data,
    deleteResume: async () =>
      (await axiosInstance.delete<{ success: boolean }>("/ai/resume")).data,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  email: string;
  isOnboarded: boolean;
}

export interface PreferenceInput {
  roles: string[];
  skills: string[];
  mustHaveSkills?: string[];
  location: string[];
  workMode?: "any" | "remote" | "hybrid" | "onsite";
  minSalary: number;
  experience: string;
  metaInfo?: string | null;
  excludedKeywords?: string[];
  excludedCompanies?: string[];
  minScore?: number;
  maxAlertsPerRun?: number;
  digestMode?: boolean;
  searchRecency?: "today" | "3days" | "week" | "month";
}

export interface Preference extends Required<
  Omit<PreferenceInput, "metaInfo">
> {
  id: number;
  metaInfo: string | null;
}

export interface TelegramConfig {
  id: number;
  botToken: string;
  chatId: string;
}

export type JobStatus =
  | "new"
  | "saved"
  | "dismissed"
  | "applied"
  | "not_relevant";

export interface JobItem {
  id: number;
  score: number;
  reason: string;
  scoreBreakdown: {
    roleFit: number;
    skills: number;
    location: number;
    salary: number;
    experience: number;
  } | null;
  decision: string;
  status: JobStatus;
  notified: boolean;
  seenAt: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  isRemote: boolean;
  source: string;
  applyLink: string;
  postedAt: string | null;
}

export interface JobHistoryFilters {
  minScore?: number;
  source?: string;
  status?: string;
  decision?: string;
}

export interface JobStats {
  fetched: number;
  new: number;
  prefiltered: number;
  evaluated: number;
  matched: number;
  notified: number;
}

export interface PipelineStatus {
  running: boolean;
  lastRun: {
    trigger: string;
    status: "success" | "error";
    stats: JobStats | null;
    error: string | null;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  nextScheduledAt: string;
}

export interface JobExplanation {
  pros: string[];
  cons: string[];
  missingSkills: string[];
  recommendation: string;
}
