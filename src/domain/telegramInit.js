import { createHmac, timingSafeEqual } from "node:crypto";
import { BookingError } from "./bookingService.js";

const MAX_AGE_SEC = 24 * 60 * 60;

export function readTelegramWebAppUser(initData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new BookingError("TELEGRAM_BOT_TOKEN не задан", 500);
  }

  const params = new URLSearchParams(String(initData || ""));
  const hash = params.get("hash");
  if (!hash) {
    throw new BookingError("Откройте запись из Telegram", 401);
  }

  const lines = [];
  for (const [key, value] of params.entries()) {
    if (key !== "hash") {
      lines.push(`${key}=${value}`);
    }
  }
  lines.sort();

  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const computed = createHmac("sha256", secret).update(lines.join("\n")).digest("hex");
  const left = Buffer.from(computed);
  const right = Buffer.from(hash);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new BookingError("Не удалось проверить Telegram", 401);
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SEC) {
    throw new BookingError("Откройте календарь в боте ещё раз", 401);
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }
  if (!user?.id) {
    throw new BookingError("Telegram не передал пользователя", 401);
  }
  return user;
}
