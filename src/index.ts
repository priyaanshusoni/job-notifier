import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { prefRouter } from "./modules/preferences/preferences.router";
import { ErrorHandler } from "./middlewares/error.middleware";
import {
  runJobPipeline,
  startScheduler,
} from "./modules/scheduler/scheduler.service";
const app = express();

app.use(express.json());

app.use("/preferences", prefRouter);

app.get("/jobs/trigger", async (req, res, next) => {
  try {
    await runJobPipeline();
    res.json({ success: true, message: "Pipeline ran successfully" });
  } catch (err) {
    next(err);
  }
});

app.use(ErrorHandler);

startScheduler();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
