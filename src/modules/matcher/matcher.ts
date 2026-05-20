import { GoogleGenAI, Type } from "@google/genai"; // Added Type import
import { prisma } from "../../lib/prisma";
import { CONFIG_PROVIDER } from "../../config";

const ai = new GoogleGenAI({
  apiKey: CONFIG_PROVIDER.GEMINI_API_KEY,
});

export async function matchJobs(jobs: any[]) {
  const preferences = await prisma.preference.findUnique({
    where: {
      id: 1,
    },
  });

  const matched: any[] = [];

  // Construct a single prompt for all jobs
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
- Roles: ${preferences?.roles.join(", ")}
- Skills: ${preferences?.skills.join(", ")}
- Location: ${preferences?.location.join(", ")}
- Min Salary: ${preferences?.minSalary}
- Experience: ${preferences?.experience}
- Meta Info: ${preferences?.metaInfo}

${jobDetails}
Score each job from 0 to 100 based on how relevant it is to the user preferences.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json", // Enforces raw JSON output (no markdown)
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
                    description:
                      "A short explanation for why this score was given",
                  },
                },
                required: ["score", "reason"], // Ensures both fields are always returned
              },
            },
          },
          required: ["scores"], // Ensures scores field is always returned
        },
      },
    });

    // Parse the response
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
