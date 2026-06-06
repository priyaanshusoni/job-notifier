import axios from "axios";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendJobAlert(job: any, config: TelegramConfig) {
  const message = `
🚀 <b>New Job Match!</b>

💼 <b>${job?.title}</b>
🏢 ${job?.company}
📍 ${job?.location}
💰 ${job?.salary}
📌 ${job?.source}
⭐ Score: ${job?.relevanceScore}/100
💡 ${job?.relevanceReason}
🔗 <a href="${job.applyLink}">Apply Now</a>
`;

  await axios.post(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      chat_id: config.chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
  );
}
