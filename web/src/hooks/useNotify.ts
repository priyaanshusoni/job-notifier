import { App } from "antd";

const TECHNICAL_PATTERNS = [
  /prisma/i,
  /invocation/i,
  /ECONNREFUSED/i,
  /getaddrinfo/i,
  /ETIMEDOUT/i,
  /internal server/i,
  /\.ts:\d+/,
  /Cannot read prop/i,
];

function sanitize(msg: string, fallback: string): string {
  if (TECHNICAL_PATTERNS.some((p) => p.test(msg))) return fallback;
  return msg;
}

export function useNotify() {
  const { message } = App.useApp();

  return {
    success: (msg: string) => message.success(msg),
    error: (err: unknown, fallback = "Something went wrong. Please try again.") => {
      const raw = err instanceof Error ? err.message : String(err);
      message.error(sanitize(raw, fallback));
    },
  };
}
