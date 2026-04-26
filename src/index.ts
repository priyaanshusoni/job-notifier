import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { prefRouter } from "./modules/preferences/preferences.router";

const app = express();

app.use(express.json());

app.use("/preferences", prefRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
