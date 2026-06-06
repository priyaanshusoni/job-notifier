import { GoogleGenAI, Type } from "@google/genai";
import { CONFIG_PROVIDER } from "../../config";

const ai = new GoogleGenAI({ apiKey: CONFIG_PROVIDER.GEMINI_API_KEY });

interface Preference {
  roles: string[];
  skills: string[];
  location: string[];
  minSalary: number;
  experience: string;
  metaInfo: string;
}

export async function matchJobs(jobs: any[], preference: Preference) {
  if (jobs.length === 0) return [];

  const jobDetails = jobs
    .map(
      (job) => `
Job Details:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Salary: ${job.salary}
- Description: ${job.description}
`,
    )
    .join("");

  const prompt = `
You are a job relevance scorer for a developer.

User preferences:
- Roles: ${preference.roles.join(", ")}
- Skills: ${preference.skills.join(", ")}
- Location: ${preference.location.join(", ")}
- Min Salary: ${preference.minSalary}
- Experience: ${preference.experience}
- Meta Info: ${preference.metaInfo}

${jobDetails}
Score each job from 0 to 100 based on how relevant it is to the user preferences.`;

  const matched: any[] = [];

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  score: {
                    type: Type.INTEGER,
                    description: "The relevance score from 0 to 100",
                  },
                  reason: {
                    type: Type.STRING,
                    description: "A short explanation for why this score was given",
                  },
                },
                required: ["score", "reason"],
              },
            },
          },
          required: ["scores"],
        },
      },
    });

    const parsed = JSON.parse(result?.text ?? "{}");

    parsed?.scores.forEach(
      (scoreData: { score: number; reason: string }, index: number) => {
        const job = jobs[index];
        console.log(
          `📊 ${job?.title} at ${job?.company} → Score: ${scoreData?.score} | ${scoreData?.reason}`,
        );

        if (scoreData?.score >= 75) {
          matched.push({
            ...job,
            relevanceScore: scoreData?.score,
            relevanceReason: scoreData?.reason,
          });
        }
      },
    );
  } catch (err) {
    console.error(`Failed to score jobs:`, err);
  }

  return matched;
}
