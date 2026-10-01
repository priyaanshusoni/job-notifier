import crypto from "crypto";
import { CONFIG_PROVIDER } from "../config";

const KEY = Buffer.from(CONFIG_PROVIDER.ENCRYPTION_KEY); // 32 bytes, validated at boot

// AES-256-GCM (authenticated). Format: "v2:<iv>:<authTag>:<ciphertext>" (hex).
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
  if (text.startsWith("v2:")) {
    const [, ivHex, tagHex, encryptedHex] = text.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  }

  // Legacy AES-256-CBC format ("iv:ciphertext") — still readable so existing
  // rows keep working; they are re-encrypted with GCM on next save.
  const [ivHex, encryptedHex] = text.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    KEY,
    Buffer.from(ivHex, "hex"),
  );
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
