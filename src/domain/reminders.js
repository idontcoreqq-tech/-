import { withDb } from "../db/connection.js";
import {
  claimReminder,
  getBooking,
  listConfirmedFrom,
  releaseReminder,
} from "../db/repositories.js";
import { addDays, formatDateLong, shopNowParts, shopWallTimeMs, SHOP } from "../lib/shop.js";
import { sendToChat } from "./telegramNotify.js";
import { BookingError } from "./bookingService.js";

const HOUR_MS = 60 * 60 * 1000;
const SOON_MS = 5 * 60 * 1000;

export function dueReminderKinds(booking, nowMs = Date.now()) {
  if (booking.status !== "confirmed" || !booking.createdAt) {
    return [];
  }
  const start = shopWallTimeMs(booking.date, booking.startTime);
  const lead = start - Date.parse(booking.createdAt);
  const until = start - nowMs;
  const kinds = [];
  if (!booking.remindHourAt && lead >= HOUR_MS && until <= HOUR_MS && until > SOON_MS) {
    kinds.push("hour");
  }
  if (!booking.remindSoonAt && lead >= SOON_MS && until <= SOON_MS && until > 0) {
    kinds.push("soon");
  }
  return kinds;
}

function reminderText(booking, kind) {
  const lead =
    kind === "hour"
      ? "Через час у вас запись в Кромке."
      : kind === "soon"
        ? "Через 5 минут у вас запись в Кромке."
        : "Напоминание: у вас запись в Кромке.";
  return [
    lead,
    "",
    `${booking.serviceName}, ${booking.durationMinutes} мин`,
    booking.barberName,
    `${formatDateLong(booking.date)}, ${booking.startTime}–${booking.endTime}`,
    `${SHOP.address}, ${SHOP.city}`,
  ].join("\n");
}

async function deliver(booking, text) {
  const privateId = booking.telegramUserId ? String(booking.telegramUserId) : "";
  const chatId = booking.telegramChatId ? String(booking.telegramChatId) : "";
  if (!privateId && !chatId) {
    throw new BookingError(
      "У клиента нет Telegram. Напоминание уходит только тем, кто записывался через бота.",
      409,
    );
  }

  if (privateId) {
    try {
      await sendToChat(privateId, text);
      return;
    } catch (error) {
      if (!chatId || chatId === privateId) {
        throw new BookingError("Не удалось написать клиенту в Telegram. Пусть сначала откроет бота и нажмёт /start.", 502);
      }
    }
  }
  await sendToChat(chatId, text);
}

export async function sendManualReminder(id) {
  const booking = await withDb((db) => getBooking(db, Number(id)));
  if (!booking || booking.status !== "confirmed") {
    throw new BookingError("Запись не найдена", 404);
  }
  await deliver(booking, reminderText(booking, "manual"));
  return { ok: true };
}

export async function dispatchDueReminders(nowMs = Date.now()) {
  const today = shopNowParts(new Date(nowMs)).date;
  const bookings = await withDb((db) => listConfirmedFrom(db, addDays(today, -1)));
  for (const booking of bookings) {
    for (const kind of dueReminderKinds(booking, nowMs)) {
      const claimed = await withDb((db) => claimReminder(db, booking.id, kind));
      if (!claimed) {
        continue;
      }
      try {
        await deliver(booking, reminderText(booking, kind));
        console.log(`Напоминание ${kind} отправлено по записи ${booking.id}`);
      } catch (error) {
        if (!error.status) {
          await withDb((db) => releaseReminder(db, booking.id, kind));
        }
        console.warn(`Напоминание ${kind} по записи ${booking.id} не ушло:`, error.message);
      }
    }
  }
}

let timer;

export function startReminderLoop() {
  if (timer || globalThis.__kromkaReminders) {
    return;
  }
  globalThis.__kromkaReminders = true;
  const tick = () => {
    dispatchDueReminders().catch((error) => {
      console.warn("Проверка напоминаний не прошла:", error.message);
    });
  };
  tick();
  timer = setInterval(tick, 30 * 1000);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
