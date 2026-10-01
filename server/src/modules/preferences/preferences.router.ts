import { Router } from "express";
import { getPreferences, setPreferences } from "./prefernces.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const prefRouter = Router();

prefRouter.get("/", authMiddleware, getPreferences);
prefRouter.post("/", authMiddleware, setPreferences);

export { prefRouter };
