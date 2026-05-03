import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { prefRouter } from "./modules/preferences/preferences.router";
import { fetchJSearchJobs } from "./modules/scrapers/jsearch.scraper";
import { ErrorHandler } from "./middlewares/error.middleware";
const app = express();

app.use(express.json());

app.use("/preferences", prefRouter);
app.use(ErrorHandler);
const PORT = process.env.PORT || 3000;

async function test() {
  const jobs = await fetchJSearchJobs();
  console.log(jobs);
}

test();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
