-- CreateTable
CREATE TABLE "Preference" (
    "id" SERIAL NOT NULL,
    "roles" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "minSalary" INTEGER NOT NULL,
    "experience" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeenJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeenJob_pkey" PRIMARY KEY ("id")
);
