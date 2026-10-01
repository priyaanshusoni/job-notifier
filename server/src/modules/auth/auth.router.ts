import { Router } from "express";
import {
  signupController,
  loginController,
  refreshController,
  logoutController,
  meController,
  completeOnboardingController,
} from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authRateLimit } from "../../middlewares/rateLimit.middleware";

const authRouter = Router();

authRouter.post("/signup", authRateLimit, signupController);
authRouter.post("/login", authRateLimit, loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", authMiddleware, meController);
authRouter.patch(
  "/complete-onboarding",
  authMiddleware,
  completeOnboardingController,
);

export { authRouter };
