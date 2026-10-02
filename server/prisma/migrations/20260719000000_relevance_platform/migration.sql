-- User: optional resume fields for resume-aware ranking
ALTER TABLE "User" ADD COLUMN "resumeText" TEXT;
ALTER TABLE "User" ADD COLUMN "resumeSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preference: customization controls
ALTER TABLE "Preference" ADD COLUMN "mustHaveSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Preference" ADD COLUMN "workMode" TEXT NOT NULL DEFAULT 'any';
ALTER TABLE "Preference" ADD COLUMN "excludedKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Preference" ADD COLUMN "excludedCompanies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Preference" ADD COLUMN "minScore" INTEGER NOT NULL DEFAULT 75;
ALTER TABLE "Preference" ADD COLUMN "maxAlertsPerRun" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Preference" ADD COLUMN "digestMode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Preference" ADD COLUMN "searchRecency" TEXT NOT NULL DEFAULT 'today';
-- metaInfo becomes optional (schema already declared it optional; align DB)
ALTER TABLE "Preference" ALTER COLUMN "metaInfo" DROP NOT NULL;

-- Canonical job records
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "salaryRaw" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryPeriod" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "applyLink" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Job_externalId_key" ON "Job"("externalId");

-- Per-user evaluation state
CREATE TABLE "UserJob" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "scoreBreakdown" JSONB,
    "decision" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    CONSTRAINT "UserJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserJob_userId_jobId_key" ON "UserJob"("userId", "jobId");
CREATE INDEX "UserJob_userId_createdAt_idx" ON "UserJob"("userId", "createdAt");
ALTER TABLE "UserJob" ADD CONSTRAINT "UserJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserJob" ADD CONSTRAINT "UserJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pipeline run history / lock
CREATE TABLE "PipelineRun" (
    "id" SERIAL NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "stats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "userId" INTEGER,
    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PipelineRun_startedAt_idx" ON "PipelineRun"("startedAt");
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing SeenJob history into Job + UserJob, then drop SeenJob.
-- Old rows had no description or salary; treat all as notified matches.
INSERT INTO "Job" ("externalId", "title", "company", "location", "description", "source", "applyLink", "fetchedAt")
SELECT DISTINCT ON ("id") "id", "title", "company", '', '', "source", "applyLink", "seenAt"
FROM "SeenJob"
ORDER BY "id", "seenAt" ASC;

INSERT INTO "UserJob" ("score", "reason", "decision", "notified", "notifiedAt", "createdAt", "updatedAt", "userId", "jobId")
SELECT s."score", s."reason", 'matched', true, s."seenAt", s."seenAt", s."seenAt", s."userId", j."id"
FROM "SeenJob" s
JOIN "Job" j ON j."externalId" = s."id";

DROP TABLE "SeenJob";
