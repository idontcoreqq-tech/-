function config() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_NOTIFY_CHAT_ID,
  };
}

export async function sendToChat(chatId, text) {
  const { token } = config();
  if (!token) {
    const error = new Error("TELEGRAM_BOT_TOKEN не задан");
    error.status = 500;
    throw error;
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.description || "Telegram не принял сообщение");
    error.status = 502;
    throw error;
  }
}

async function sendMessage(text) {
  const { chatId } = config();
  if (!chatId) {
    console.warn("Дубль в Telegram пропущен: нет TELEGRAM_NOTIFY_CHAT_ID");
    return;
  }

  try {
    await sendToChat(chatId, text);
  } catch (error) {
    console.warn("Дубль в Telegram не отправился:", error.message);
  }
}

function sourceLabel(source) {
  return source === "telegram" ? "бот" : "сайт";
}

export async function notifyNewBooking(booking) {
  const text = [
    `Новая запись · ${sourceLabel(booking.source)}`,
    "",
    `Барбер: ${booking.barberName}`,
    `Услуга: ${booking.serviceName}, ${booking.durationMinutes} мин`,
    `Когда: ${booking.date}, ${booking.startTime}–${booking.endTime}`,
    `Клиент: ${booking.clientName}`,
    `Телефон: ${booking.clientPhone}`,
  ].join("\n");
  await sendMessage(text);
}

export async function notifyCancelledBooking(booking, cancelledBy) {
  const who = cancelledBy === "admin" ? "админ" : "клиент";
  const text = [
    "Отмена записи",
    "",
    `Барбер: ${booking.barberName}`,
    `Услуга: ${booking.serviceName}`,
    `Когда: ${booking.date}, ${booking.startTime}–${booking.endTime}`,
    `Клиент: ${booking.clientName}`,
    `Кто отменил: ${who}`,
  ].join("\n");
  await sendMessage(text);
}
