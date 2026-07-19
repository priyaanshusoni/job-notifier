import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { apiRateLimit } from "../../middlewares/rateLimit.middleware";
import { searchCopilotSchema, resumeSchema } from "../../lib/validation";
import {
  suggestSearchProfile,
  saveResume,
  getResumeStatus,
  deleteResume,
} from "./ai.service";

const aiRouter = Router();
aiRouter.use(authMiddleware, apiRateLimit);

// Search copilot: plain language → structured search profile (proposal only)
aiRouter.post("/search-profile", async (req, res, next) => {
  try {
    const { text } = searchCopilotSchema.parse(req.body);
    const data = await suggestSearchProfile(text);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/resume", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const { resumeText } = resumeSchema.parse(req.body);
    const data = await saveResume(userId, resumeText);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

aiRouter.get("/resume", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const data = await getResumeStatus(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

aiRouter.delete("/resume", async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    await deleteResume(userId);
    res.json({ success: true, message: "Resume deleted" });
  } catch (err) {
    next(err);
  }
});

export { aiRouter };
