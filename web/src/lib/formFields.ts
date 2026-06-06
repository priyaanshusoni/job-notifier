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

export const PREFERENCE_FIELDS: FormField[] = [
  {
    name: "roles",
    label: "Target roles",
    type: "multiselect",
    placeholder: "Full Stack Developer, Backend Developer...",
    options: toOptions(ROLES),
    rules: [{ required: true, message: "Select at least one role" }],
  },
  {
    name: "skills",
    label: "Key skills",
    type: "multiselect",
    placeholder: "React.js, Node.js, TypeScript...",
    options: toOptions(SKILLS),
    rules: [{ required: true, message: "Select at least one skill" }],
  },
  {
    name: "location",
    label: "Preferred locations",
    type: "multiselect",
    placeholder: "Remote, Bangalore, Mumbai...",
    options: toOptions(LOCATIONS),
    rules: [{ required: true, message: "Select at least one location" }],
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
