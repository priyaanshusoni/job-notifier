import dotenv from "dotenv";
import path from "path";

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${env}`),
});

const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;

const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_in_prod";
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "12345678901234567890123456789012"; // 32 chars
const PORT = process.env.PORT || 3000;

export const CONFIG_PROVIDER = {
  JSEARCH_API_KEY,
  DATABASE_URL,
  GEMINI_API_KEY,
  JWT_SECRET,
  ENCRYPTION_KEY,
  PORT,
  ENVIRONMENT: env,
};
