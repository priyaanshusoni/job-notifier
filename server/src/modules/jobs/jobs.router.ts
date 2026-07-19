import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { triggerRateLimit } from "../../middlewares/rateLimit.middleware";
import { runJobPipelineForUser } from "../scheduler/scheduler.service";
import { JobsService } from "./jobs.service";
import { jobStatusSchema } from "../../lib/validation";
import { explainJobFit } from "../ai/ai.service";
import { ApiError } from "../../lib/errors";

const jobsRouter = Router();
jobsRouter.use(authMiddleware);

// Manually run the pipeline for the current user (state-changing → POST)
jobsRouter.post(
  "/trigger",
  triggerRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const stats = await runJobPipelineForUser(userId, "manual");
      res.json({ success: true, message: "Pipeline ran successfully", stats });
    } catch (err) {
      next(err);
    }
  },
);

jobsRouter.get("/history", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const data = await JobsService.getHistory(userId, {
      minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
      source: req.query.source as string | undefined,
      status: req.query.status as string | undefined,
      decision: req.query.decision as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Feedback: save / dismiss / applied / not_relevant
jobsRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const userJobId = Number(req.params.id);
    if (!Number.isInteger(userJobId)) throw ApiError.badRequest("Invalid job id");
    const { status } = jobStatusSchema.parse(req.body);
    const data = await JobsService.updateStatus(userId, userJobId, status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get("/pipeline/status", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const data = await JobsService.getPipelineStatus(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// AI fit explainer: evidence for/against a specific match
jobsRouter.post("/:id/explain", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const userJobId = Number(req.params.id);
    if (!Number.isInteger(userJobId)) throw ApiError.badRequest("Invalid job id");
    const data = await explainJobFit(userId, userJobId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export { jobsRouter };
