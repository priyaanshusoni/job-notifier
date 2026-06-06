import "./config";
import express from "express";
import cors from "cors";

import { authRouter } from "./modules/auth/auth.router";
import { prefRouter } from "./modules/preferences/preferences.router";
import { telegramRouter } from "./modules/telegram/telegram.router";
import { ErrorHandler } from "./middlewares/error.middleware";
import { authMiddleware } from "./middlewares/auth.middleware";
import { apiRateLimit, triggerRateLimit } from "./middlewares/rateLimit.middleware";
import {
  runJobPipelineForUser,
  startScheduler,
} from "./modules/scheduler/scheduler.service";
import { prisma } from "./lib/prisma";
import { CONFIG_PROVIDER } from "./config";

const app = express();

// --- Core Middleware ---
app.use(cors({ origin: "http://localhost:3001", credentials: true }));
app.use(express.json());
app.use(apiRateLimit); // Apply general rate limit to all routes

// --- Public Routes ---
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is healthy", timestamp: new Date() });
});

app.use("/auth", authRouter);

// --- Protected Routes ---
app.use("/preferences", prefRouter);
app.use("/telegram", telegramRouter);

// Manually trigger pipeline for the current user
app.get(
  "/jobs/trigger",
  authMiddleware,
  triggerRateLimit,
  async (req, res, next) => {
    try {
      const userId = (req as any).user.userId;
      const stats = await runJobPipelineForUser(userId);
      res.json({ success: true, message: "Pipeline ran successfully", stats });
    } catch (err) {
      next(err);
    }
  },
);

// Get job history for the current user
app.get("/jobs/history", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const jobs = await prisma.seenJob.findMany({
      where: { userId },
      orderBy: { seenAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
});

// --- Error Handler ---
app.use(ErrorHandler);

// --- Start ---
startScheduler();
const PORT = CONFIG_PROVIDER.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
