import { Router } from "express";
import { getPreferences, setPreferences } from "./prefernces.controller";

const prefRouter = Router();

prefRouter.get("/", getPreferences);

prefRouter.post("/", setPreferences);

export { prefRouter };
