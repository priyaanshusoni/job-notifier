import axios from "axios";
import { CONFIG_PROVIDER } from "../../config";

export async function sendJobAlert(job: any) {
  const message = `
🚀 <b>New Job Match!</b>

💼 <b>${job?.title}</b>
🏢 ${job?.company}
📍 ${job?.location}
💰 ${job?.salary}
📌 ${job?.source}
🔗 <a href="${job.applyLink}">Apply Now</a>
`;

  await axios.post(
    `https://api.telegram.org/bot${CONFIG_PROVIDER.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: CONFIG_PROVIDER.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
  );
}
