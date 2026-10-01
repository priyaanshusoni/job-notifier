import type { FormField } from "@/components/FormRenderer";

const toOptions = (values: string[]) => values.map((v) => ({ label: v, value: v }));

const ROLES = [
  "Full Stack Developer", "Backend Developer", "Frontend Developer",
  "Software Engineer", "React Developer", "Node.js Developer",
  "DevOps Engineer", "Python Developer", "Data Engineer", "Mobile Developer",
];

const SKILLS = [
  "React.js", "Next.js", "Node.js", "TypeScript", "JavaScript",
  "Python", "Django", "FastAPI", "Express.js", "PostgreSQL",
  "MongoDB", "Redis", "AWS", "Docker", "Kubernetes", "GraphQL",
  "Tailwind CSS", "Vue.js", "Golang", "Java",
];

const LOCATIONS = [
  "Remote", "Bangalore", "Mumbai", "Delhi", "Hyderabad",
  "Jaipur", "Pune", "Chennai", "Noida", "Gurugram", "India",
];

const EXPERIENCE = [
  "Fresher (0-1 years)", "1-3 years", "3-5 years", "5-8 years", "8+ years",
];

const WORK_MODES = [
  { label: "Any", value: "any" },
  { label: "Remote only", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
];

const RECENCY = [
  { label: "Posted today", value: "today" },
  { label: "Last 3 days", value: "3days" },
  { label: "Last week", value: "week" },
  { label: "Last month", value: "month" },
];

// Core preference fields — shown during onboarding
export const PREFERENCE_FIELDS: FormField[] = [
  {
    name: "roles",
    label: "Target roles",
    type: "tags",
    placeholder: "Full Stack Developer, Backend Developer... (type to add your own)",
    options: toOptions(ROLES),
    rules: [{ required: true, message: "Select at least one role" }],
  },
  {
    name: "skills",
    label: "Key skills",
    type: "tags",
    placeholder: "React.js, Node.js, TypeScript... (type to add your own)",
    options: toOptions(SKILLS),
    rules: [{ required: true, message: "Select at least one skill" }],
  },
  {
    name: "mustHaveSkills",
    label: "Must-have skills",
    type: "tags",
    placeholder: "Jobs without any of these are filtered out",
    options: toOptions(SKILLS),
    tooltip: "Optional. A job is skipped unless it mentions at least one of these.",
  },
  {
    name: "location",
    label: "Preferred locations",
    type: "tags",
    placeholder: "Remote, Bangalore, Mumbai...",
    options: toOptions(LOCATIONS),
    rules: [{ required: true, message: "Select at least one location" }],
  },
  {
    name: "workMode",
    label: "Work mode",
    type: "select",
    colSpan: 12,
    options: WORK_MODES,
  },
  {
    name: "searchRecency",
    label: "Search jobs posted within",
    type: "select",
    colSpan: 12,
    options: RECENCY,
  },
  {
    name: "minSalary",
    label: "Min salary (₹/year)",
    type: "number",
    placeholder: "800000",
    colSpan: 12,
    rules: [{ required: true, message: "Required" }],
    inputProps: {
      formatter: (v: number | string | undefined) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (v: string | undefined) => Number(v?.replace(/,/g, "") ?? 0) as unknown as 0,
    },
  },
  {
    name: "experience",
    label: "Experience level",
    type: "select",
    placeholder: "Select...",
    colSpan: 12,
    options: toOptions(EXPERIENCE),
    rules: [{ required: true, message: "Required" }],
  },
  {
    name: "metaInfo",
    label: "Additional preferences",
    type: "textarea",
    placeholder: "e.g. product companies, startups, remote-first, equity...",
    tooltip: "Describe the type of companies, work culture, or anything else relevant",
  },
];

// Alert tuning fields — shown in dashboard settings alongside core fields
export const ALERT_FIELDS: FormField[] = [
  {
    name: "excludedKeywords",
    label: "Excluded keywords",
    type: "tags",
    placeholder: "e.g. WordPress, PHP, internship",
    tooltip: "Jobs whose title or description mention these are filtered out",
  },
  {
    name: "excludedCompanies",
    label: "Excluded companies",
    type: "tags",
    placeholder: "Companies you never want alerts from",
  },
  {
    name: "minScore",
    label: "Match score threshold",
    type: "slider",
    tooltip: "Only jobs scoring at or above this are sent as alerts. Lower = more alerts, higher = fewer but better.",
    inputProps: { min: 50, max: 95, step: 5, marks: { 50: "50", 75: "75", 95: "95" } },
  },
  {
    name: "maxAlertsPerRun",
    label: "Max alerts per run",
    type: "number",
    colSpan: 12,
    inputProps: { min: 1, max: 50 },
  },
  {
    name: "digestMode",
    label: "Digest mode",
    type: "switch",
    colSpan: 12,
    tooltip: "On: one combined Telegram message per run. Off: one message per job.",
  },
];

export const PREFERENCE_DEFAULTS = {
  workMode: "any",
  searchRecency: "today",
  mustHaveSkills: [],
  excludedKeywords: [],
  excludedCompanies: [],
  minScore: 75,
  maxAlertsPerRun: 10,
  digestMode: true,
};

export const TELEGRAM_FIELDS: FormField[] = [
  {
    name: "botToken",
    label: "Bot Token",
    type: "password",
    placeholder: "7234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    tooltip: "Looks like: 7234567890:AAFxxx...",
    rules: [
      { required: true, message: "Bot token is required" },
      { pattern: /^\d+:[A-Za-z0-9_-]{35,}$/, message: "Invalid bot token format" },
    ],
    inputProps: { style: { fontFamily: "monospace" } },
  },
  {
    name: "chatId",
    label: "Chat ID",
    type: "text",
    placeholder: "123456789",
    tooltip: "Your personal chat ID (get it from @userinfobot)",
    rules: [
      { required: true, message: "Chat ID is required" },
      { pattern: /^-?\d+$/, message: "Chat ID should be a number" },
    ],
    inputProps: { style: { fontFamily: "monospace" } },
  },
];
