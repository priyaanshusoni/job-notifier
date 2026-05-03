import { prisma } from "../src/lib/prisma";

const data = {
  roles: ["Full Stack Developer", "Backend Developer"],
  minSalary: 800000,
  location: [
    "India",
    "Jaipur",
    "Pune",
    "Mumbai",
    "Bangalore",
    "Noida",
    "Gurugram",
  ],
  skills: [
    "Node.js",
    "React.js",
    "TypeScript",
    "Express.js",
    "MongoDB",
    "PostgreSQL",
    "AWS",
    "Docker",
    "Python",
    "Django",
    "Fast API",
    "Tailwind CSS",
    "Next.js",
    "Redis",
    "DevOps",
    "Data Structures",
    "Algorithms",
  ],

  metaInfo:
    "product based companies, remote jobs, work from home, visa sponsorship, startups, mid-size companies, large enterprises",

  experience: "1-3 years",
};

async function seedData() {
  try {
    await prisma.preference.upsert({
      where: { id: 1 },
      update: { ...data },
      create: { id: 1, ...data },
    });
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  } finally {
    // Disconnect Prisma Client at the end of the seeding process
    await prisma.$disconnect();
    process.exit(0);
  }
}

seedData();
