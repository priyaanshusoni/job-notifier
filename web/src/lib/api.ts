const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// Auth
export const api = {
  auth: {
    signup: (email: string, password: string) =>
      apiFetch<{ token: string; user: User }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    completeOnboarding: () =>
      apiFetch<{ user: User }>("/auth/complete-onboarding", {
        method: "PATCH",
      }),
  },
  preferences: {
    get: () => apiFetch<{ data: Preference | null }>("/preferences"),
    save: (data: PreferenceInput) =>
      apiFetch<{ data: Preference }>("/preferences", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  telegram: {
    get: () => apiFetch<{ data: TelegramConfig | null }>("/telegram/config"),
    save: (botToken: string, chatId: string) =>
      apiFetch<{ data: TelegramConfig }>("/telegram/config", {
        method: "POST",
        body: JSON.stringify({ botToken, chatId }),
      }),
  },
  jobs: {
    trigger: () =>
      apiFetch<{ success: boolean; stats: JobStats }>("/jobs/trigger"),
    history: () => apiFetch<{ data: SeenJob[] }>("/jobs/history"),
  },
};

// Types
export interface User {
  id: number;
  email: string;
  isOnboarded: boolean;
}

export interface Preference {
  id: number;
  roles: string[];
  skills: string[];
  location: string[];
  minSalary: number;
  experience: string;
  metaInfo: string;
}

export interface PreferenceInput {
  roles: string[];
  skills: string[];
  location: string[];
  minSalary: number;
  experience: string;
  metaInfo: string;
}

export interface TelegramConfig {
  id: number;
  botToken: string;
  chatId: string;
}

export interface SeenJob {
  id: string;
  title: string;
  company: string;
  score: number;
  reason: string;
  source: string;
  applyLink: string;
  seenAt: string;
}

export interface JobStats {
  total: number;
  new: number;
  matched: number;
}
