import "./config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth/auth.router";
import { prefRouter } from "./modules/preferences/preferences.router";
import { telegramRouter } from "./modules/telegram/telegram.router";
import { jobsRouter } from "./modules/jobs/jobs.router";
import { aiRouter } from "./modules/ai/ai.router";
import { ErrorHandler } from "./middlewares/error.middleware";
import { apiRateLimit } from "./middlewares/rateLimit.middleware";
import { startScheduler } from "./modules/scheduler/scheduler.service";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import { CONFIG_PROVIDER } from "./config";

const app = express();

app.use(cors({ origin: CONFIG_PROVIDER.ALLOWED_ORIGINS, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(apiRateLimit);

// --- Public Routes ---
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: "Server is healthy",
      timestamp: new Date(),
    });
  } catch {
    res.status(503).json({ success: false, message: "Database unreachable" });
  }
});

app.use("/auth", authRouter);

// --- Protected Routes  ---
app.use("/preferences", prefRouter);
app.use("/telegram", telegramRouter);
app.use("/jobs", jobsRouter);
app.use("/ai", aiRouter);

// --- Error Handler ---
app.use(ErrorHandler);

// --- Start ---
startScheduler();
const PORT = CONFIG_PROVIDER.PORT;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
