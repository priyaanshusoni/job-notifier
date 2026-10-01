import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function seedData() {
  try {
    // Create a seed user for development
    const hashedPassword = await bcrypt.hash("password123", 12);
    const user = await prisma.user.upsert({
      where: { email: "dev@jobnotifier.com" },
      update: {},
      create: {
        email: "dev@jobnotifier.com",
        password: hashedPassword,
        isOnboarded: true,
        preference: {
          create: {
            roles: ["Full Stack Developer", "Backend Developer"],
            skills: [
              "Node.js", "React.js", "TypeScript", "Express.js",
              "MongoDB", "PostgreSQL", "Next.js", "Redis",
            ],
            location: ["India", "Jaipur", "Bangalore", "Remote"],
            workMode: "any",
            mustHaveSkills: ["Node.js"],
            minSalary: 800000,
            experience: "1-3 years",
            metaInfo:
              "product based companies, remote jobs, startups, mid-size companies",
            excludedKeywords: ["internship", "unpaid"],
            minScore: 75,
            maxAlertsPerRun: 10,
            digestMode: true,
            searchRecency: "today",
          },
        },
      },
    });
    console.log("✅ Seed user created:", user.email);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

seedData();
