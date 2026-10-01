import { Router } from "express";
import {
  signupController,
  loginController,
  completeOnboardingController,
} from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/signup", signupController);
authRouter.post("/login", loginController);
authRouter.patch(
  "/complete-onboarding",
  authMiddleware,
  completeOnboardingController,
);

export { authRouter };
