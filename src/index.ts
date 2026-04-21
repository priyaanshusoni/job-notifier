import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

console.log(accountSid, authToken);

async function createMessage() {
  const message = await client.messages.create({
    body: "hi , this is a test message from twilio",
    from: `whatsapp:${process.env.TWILIO_NUMBER}`,
    to: `whatsapp:${process.env.MY_WHATSAPP_NUMBER}`,
  });

  console.log(message.body);
}

createMessage();
