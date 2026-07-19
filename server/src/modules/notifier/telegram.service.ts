import axios from "axios";
import { ApiError } from "../../lib/errors";
import { logger } from "../../lib/logger";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface AlertJob {
  title: string;
  company: string;
  location: string;
  salary: string | null;
  source: string;
  score: number;
  reason: string;
  applyLink: string;
}

const TELEGRAM_MESSAGE_LIMIT = 4096;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function send(config: TelegramConfig, html: string) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        chat_id: config.chatId,
        text: html.slice(0, TELEGRAM_MESSAGE_LIMIT),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      { timeout: 15_000 },
    );
  } catch (error: any) {
    logger.error(
      { error: error?.response?.data ?? error?.message },
      "Telegram send failed",
    );
    throw ApiError.upstream(
      "Telegram message could not be delivered",
      "TELEGRAM_ERROR",
    );
  }
}

function formatJob(job: AlertJob): string {
  return `💼 <b>${escapeHtml(job.title)}</b>
🏢 ${escapeHtml(job.company)} · 📍 ${escapeHtml(job.location)}
💰 ${escapeHtml(job.salary ?? "Not specified")} · 📌 ${escapeHtml(job.source)}
⭐ Score: ${job.score}/100
💡 ${escapeHtml(job.reason)}
🔗 <a href="${escapeHtml(job.applyLink)}">Apply Now</a>`;
}

export async function sendJobAlert(job: AlertJob, config: TelegramConfig) {
  await send(config, `🚀 <b>New Job Match!</b>\n\n${formatJob(job)}`);
}

/** One combined message per run; splits automatically at Telegram's limit. */
export async function sendJobDigest(jobs: AlertJob[], config: TelegramConfig) {
  if (jobs.length === 0) return;

  const header = `🚀 <b>${jobs.length} new job match${jobs.length > 1 ? "es" : ""} for you</b>\n`;
  let current = header;
  const messages: string[] = [];

  for (const job of jobs) {
    const block = `\n${formatJob(job)}\n`;
    if (current.length + block.length > TELEGRAM_MESSAGE_LIMIT) {
      messages.push(current);
      current = block;
    } else {
      current += block;
    }
  }
  messages.push(current);

  for (const message of messages) {
    await send(config, message);
  }
}

export async function sendTestMessage(config: TelegramConfig) {
  await send(
    config,
    "✅ <b>Job Notifier connected!</b>\nYou will receive your job matches in this chat.",
  );
}
