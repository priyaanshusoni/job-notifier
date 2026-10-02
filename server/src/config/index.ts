import dotenv from "dotenv";
import path from "path";

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${env}`),
});

const isProd = env === "production";
const isString = (value: string | undefined): value is string => Boolean(value);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Set it in .env.${env} — refusing to start with an insecure default.`,
    );
  }
  return value;
}

const ALLOWED_ORIGINS = (
  isProd
    ? [process.env.ALLOWED_ORIGIN]
    : [
        process.env.ALLOWED_ORIGIN,
        "http://localhost:3000",
        "http://localhost:3001",
      ]
).filter(isString);

const JWT_SECRET = required("JWT_SECRET");
const ENCRYPTION_KEY = required("ENCRYPTION_KEY");
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be exactly 32 characters (AES-256).");
}

export const CONFIG_PROVIDER = {
  JSEARCH_API_KEY: required("JSEARCH_API_KEY"),
  DATABASE_URL: required("DATABASE_URL"),
  GEMINI_API_KEY: required("GEMINI_API_KEY"),
  JWT_SECRET,
  ENCRYPTION_KEY,
  PORT: process.env.PORT || 3000,
  ENVIRONMENT: env,
  IS_PROD: isProd,
  ALLOWED_ORIGINS,
};
