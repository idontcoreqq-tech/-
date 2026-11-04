import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Bot, InlineKeyboard, Keyboard } from "grammy";
import {
  cancelBooking,
  createBooking,
  getCatalog,
  getClientBookings,
  getWeekSlots,
} from "../domain/bookingService.js";
import { addDays, formatDateLabel, WEEKDAY_LABELS, weekdayFromIsoDate } from "../lib/shop.js";
import { startReminderLoop } from "../domain/reminders.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || "";
const lockPath = join(process.cwd(), "data", "bot.lock");

const sessions = new Map();
function menuFor(ctx) {
  const keyboard = new Keyboard().text("Запись").text("Мои записи");
  if (webAppUrl && ctx.chat?.type === "private") {
    keyboard.row().webApp("Календарь", webAppUrl);
  }
  return keyboard.resized();
}

function session(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: "idle" });
  }
  return sessions.get(userId);
}

function reset(userId) {
  sessions.set(userId, { step: "idle" });
}

const bot = new Bot(token);

bot.catch(async (error) => {
  const reason = error.error?.message || error.message || "неизвестная ошибка";
  console.warn("Ошибка бота:", reason);
  try {
    await error.ctx?.reply("Не получилось обработать сообщение. Нажмите «Запись» и начните снова.");
  } catch {
    // Чат мог быть недоступен.
  }
});

bot.command("start", async (ctx) => {
  reset(ctx.from.id);
  const text = webAppUrl
    ? "Кромка. Откройте «Календарь» в личке с ботом: там месяц, мастер и свободное время."
    : "Кромка. Запись к барберу: услуга, мастер, день и время. Нажмите «Запись» или начните сразу.";
  await ctx.reply(text, { reply_markup: menuFor(ctx) });
  if (String(ctx.match || "").trim() === "book") {
    await startBooking(ctx);
  }
});

bot.hears("Запись", (ctx) => startBooking(ctx));
bot.command("book", (ctx) => startBooking(ctx));
bot.hears("Мои записи", (ctx) => showMine(ctx));

async function startBooking(ctx) {
  const state = session(ctx.from.id);
  const catalog = await getCatalog();
  state.step = "service";
  state.catalog = catalog;
  const keyboard = new InlineKeyboard();
  for (const service of catalog.services) {
    keyboard.text(`${service.name}, ${service.durationMinutes} мин`, `svc:${service.id}`).row();
  }
  await ctx.reply("Какая услуга?", { reply_markup: keyboard });
}

async function showMine(ctx) {
  const bookings = await getClientBookings(ctx.from.id);
  if (bookings.length === 0) {
    await ctx.reply("Активных записей нет.");
    return;
  }
  for (const booking of bookings) {
    const keyboard = new InlineKeyboard().text("Отменить", `cx:${booking.id}`);
    await ctx.reply(
      `${booking.serviceName}\n${booking.date}, ${booking.startTime}–${booking.endTime}\n${booking.barberName}`,
      { reply_markup: keyboard },
    );
  }
}

bot.callbackQuery(/^svc:(\d+)$/, async (ctx) => {
  const state = session(ctx.from.id);
  const serviceId = Number(ctx.match[1]);
  state.serviceId = serviceId;
  state.step = "barber";
  const keyboard = new InlineKeyboard();
  for (const barber of (await getCatalog()).barbers) {
    keyboard.text(barber.name, `brb:${barber.id}`).row();
  }
  await ctx.answerCallbackQuery();
  await ctx.reply("К кому?", { reply_markup: keyboard });
});

bot.callbackQuery(/^brb:(\d+)$/, async (ctx) => {
  const state = session(ctx.from.id);
  state.barberId = Number(ctx.match[1]);
  state.step = "day";
  await ctx.answerCallbackQuery();
  await sendDays(ctx, state, 0);
});

async function sendDays(ctx, state, page) {
  const fromDate = state.catalog?.today || (await getCatalog()).today;
  const start = page === 0 ? fromDate : addDays(fromDate, 7);
  const week = await getWeekSlots({
    barberId: state.barberId,
    serviceId: state.serviceId,
    fromDate: start,
    days: 7,
  });
  const keyboard = new InlineKeyboard();
  for (const day of week.days) {
    const label = `${WEEKDAY_LABELS[weekdayFromIsoDate(day.date)]} ${formatDateLabel(day.date)}`;
    if (day.slots.length === 0) {
      keyboard.text(`${label} · нет`, "noop").row();
    } else {
      keyboard.text(label, `day:${day.date}`).row();
    }
  }
  keyboard.text(page === 0 ? "Дальше" : "Назад", `pg:${page === 0 ? 1 : 0}`);
  await ctx.reply("Какой день?", { reply_markup: keyboard });
}

bot.callbackQuery(/^pg:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendDays(ctx, session(ctx.from.id), Number(ctx.match[1]));
});

bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "В этот день смены нет" });
});

bot.callbackQuery(/^day:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  const state = session(ctx.from.id);
  state.date = ctx.match[1];
  state.step = "time";
  const week = await getWeekSlots({
    barberId: state.barberId,
    serviceId: state.serviceId,
    fromDate: state.date,
    days: 1,
  });
  const slots = week.days[0]?.slots ?? [];
  const keyboard = new InlineKeyboard();
  slots.forEach((time, index) => {
    keyboard.text(time, `tm:${time}`);
    if (index % 3 === 2) {
      keyboard.row();
    }
  });
  await ctx.answerCallbackQuery();
  if (slots.length === 0) {
    await ctx.reply("Свободного времени нет, выберите другой день.");
    return;
  }
  await ctx.reply("Какое время?", { reply_markup: keyboard });
});

bot.callbackQuery(/^tm:(\d{2}:\d{2})$/, async (ctx) => {
  const state = session(ctx.from.id);
  state.startTime = ctx.match[1];
  state.step = "name";
  await ctx.answerCallbackQuery();
  await ctx.reply("Как к вам обращаться?");
});

bot.callbackQuery(/^cx:(\d+)$/, async (ctx) => {
  try {
    const booking = await cancelBooking(Number(ctx.match[1]), {
      by: "telegram",
      telegramUserId: ctx.from.id,
    });
    await ctx.answerCallbackQuery();
    await ctx.reply(`Запись на ${booking.date} в ${booking.startTime} отменена.`);
  } catch (error) {
    await ctx.answerCallbackQuery({ text: error.message });
  }
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (text === "Запись" || text === "Мои записи") {
    return;
  }
  const state = session(ctx.from.id);
  if (state.step === "name") {
    state.clientName = text.trim();
    state.step = "phone";
    await ctx.reply("Телефон Узбекистана, например +998 90 123 45 67");
    return;
  }
  if (state.step === "phone") {
    state.clientPhone = text.trim();
    state.step = "confirm";
    const catalog = await getCatalog();
    const service = catalog.services.find((item) => item.id === state.serviceId);
    const barber = catalog.barbers.find((item) => item.id === state.barberId);
    const keyboard = new InlineKeyboard().text("Подтвердить", "ok").text("Сбросить", "no");
    await ctx.reply(
      `${service?.name}\n${barber?.name}\n${state.date}, ${state.startTime}\n${state.clientName}, ${state.clientPhone}`,
      { reply_markup: keyboard },
    );
    return;
  }
  await ctx.reply("Нажмите «Запись», чтобы выбрать услугу, или «Мои записи».", {
    reply_markup: menuFor(ctx),
  });
});

bot.callbackQuery("no", async (ctx) => {
  reset(ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.reply("Лист очищен. Нажмите «Запись», чтобы начать снова.", { reply_markup: menuFor(ctx) });
});

bot.callbackQuery("ok", async (ctx) => {
  const state = session(ctx.from.id);
  try {
    const booking = await createBooking({
      serviceId: state.serviceId,
      barberId: state.barberId,
      date: state.date,
      startTime: state.startTime,
      clientName: state.clientName,
      clientPhone: state.clientPhone,
      source: "telegram",
      telegramUserId: ctx.from.id,
      telegramChatId: ctx.chat.id,
    });
    reset(ctx.from.id);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `Запись стоит: ${booking.serviceName}, ${booking.date}, ${booking.startTime}–${booking.endTime}, ${booking.barberName}.`,
      { reply_markup: menuFor(ctx) },
    );
  } catch (error) {
    await ctx.answerCallbackQuery();
    await ctx.reply(error.message);
  }
});

function takeLock() {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  try {
    const pid = Number(readFileSync(lockPath, "utf8"));
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        return false;
      } catch {
        // Старый процесс уже не жив.
      }
    }
  } catch {
    // Файла блокировки ещё нет.
  }
  writeFileSync(lockPath, String(process.pid));
  const release = () => {
    try {
      if (readFileSync(lockPath, "utf8") === String(process.pid)) {
        unlinkSync(lockPath);
      }
    } catch {
      // Файл уже снят.
    }
  };
  process.once("exit", release);
  return true;
}

export function startBot() {
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN не задан. Бот не запускает long polling.");
    return;
  }
  if (globalThis.__kromkaBotStarted) {
    return;
  }
  if (!takeLock()) {
    console.warn("Бот уже слушает Telegram в другом процессе.");
    return;
  }
  globalThis.__kromkaBotStarted = true;
  startReminderLoop();
  bot
    .start({
      onStart: async () => {
        console.log("Бот Кромки слушает Telegram.");
        if (!webAppUrl) {
          return;
        }
        try {
          await bot.api.setChatMenuButton({
            menu_button: {
              type: "web_app",
              text: "Календарь",
              web_app: { url: webAppUrl },
            },
          });
        } catch (error) {
          console.warn("Кнопка календаря не включилась:", error.message);
        }
      },
    })
    .catch((error) => {
      globalThis.__kromkaBotStarted = false;
      console.warn("Бот не запустился:", error.message);
    });
}

const launchedDirectly =
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase();

if (launchedDirectly) {
  startBot();
}
