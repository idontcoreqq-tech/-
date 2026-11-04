export const SHOP = {
  name: "Кромка",
  city: "Екатеринбург",
  address: "ул. Вайнера, 12",
  phone: "+998 71 210-45-90",
  telegram: "https://t.me/kromka_abdulla_bot?start=book",
  timezone: "Asia/Yekaterinburg",
  slotStepMinutes: 30,
};

export const WEEKDAY_LABELS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const WEEKDAY_FULL = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutes(time, amount) {
  return minutesToTime(timeToMinutes(time) + amount);
}

export function weekdayFromIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

export function addDays(isoDate, amount) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount, 12, 0, 0));
  return next.toISOString().slice(0, 10);
}

export function mondayOf(isoDate) {
  const weekday = weekdayFromIsoDate(isoDate);
  const shift = weekday === 0 ? -6 : 1 - weekday;
  return addDays(isoDate, shift);
}

export function shopNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const value = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function formatDateLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export function formatDateLong(isoDate) {
  const weekday = weekdayFromIsoDate(isoDate);
  return `${WEEKDAY_FULL[weekday]}, ${formatDateLabel(isoDate)}`;
}

export function formatPrice(amount) {
  return `${amount.toLocaleString("ru-RU")} сум`;
}

export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
  }
  return phone;
}

export function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  throw new Error("Укажите номер Узбекистана: +998 и ещё 9 цифр");
}

export function normalizeName(name) {
  const value = String(name || "").trim().replace(/\s+/g, " ");
  if (value.length < 2) {
    throw new Error("Укажите имя");
  }
  return value;
}

export function shopWallTimeMs(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  const wanted = utc;
  for (let step = 0; step < 4; step += 1) {
    const parts = shopNowParts(new Date(utc));
    const [partYear, partMonth, partDay] = parts.date.split("-").map(Number);
    const [partHour, partMinute] = parts.time.split(":").map(Number);
    const shown = Date.UTC(partYear, partMonth - 1, partDay, partHour, partMinute);
    if (shown === wanted) {
      return utc;
    }
    utc += wanted - shown;
  }
  return utc;
}

export function isPastSlot(date, startTime) {
  const now = shopNowParts();
  if (date < now.date) {
    return true;
  }
  if (date === now.date && startTime <= now.time) {
    return true;
  }
  return false;
}
