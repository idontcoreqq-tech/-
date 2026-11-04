import { withDb, withTransaction } from "../db/connection.js";
import {
  cancelBookingRow,
  getBarber,
  getBooking,
  getScheduleForDay,
  getService,
  insertBarber,
  insertBooking,
  listBarbers,
  listBookingsByTelegramUser,
  listConfirmedBookings,
  listServices,
  updateBarber,
} from "../db/repositories.js";
import {
  addDays,
  addMinutes,
  formatDateLong,
  isPastSlot,
  minutesToTime,
  normalizeName,
  normalizePhone,
  SHOP,
  shopNowParts,
  timeToMinutes,
  weekdayFromIsoDate,
} from "../lib/shop.js";
import { notifyCancelledBooking, notifyNewBooking } from "./telegramNotify.js";

export class BookingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getCatalog() {
  return withDb(async (db) => ({
    services: await listServices(db),
    barbers: await listBarbers(db, { activeOnly: true }),
    shop: SHOP,
    today: shopNowParts().date,
  }));
}

async function loadOpenPair(db, barberId, serviceId) {
  const barber = await getBarber(db, Number(barberId));
  const service = await getService(db, Number(serviceId));
  if (!barber || !barber.active) {
    throw new BookingError("Барбер не найден");
  }
  if (!service) {
    throw new BookingError("Услуга не найдена");
  }
  return { barber, service };
}

export async function getWeekSlots({ barberId, serviceId, fromDate, days = 7 }) {
  return withDb(async (db) => {
    const { barber, service } = await loadOpenPair(db, barberId, serviceId);
    const start = fromDate || shopNowParts().date;
    const result = [];
    for (let index = 0; index < days; index += 1) {
      const date = addDays(start, index);
      result.push({
        date,
        weekday: weekdayFromIsoDate(date),
        label: formatDateLong(date),
        slots: await freeStarts(db, barber, service, date),
      });
    }
    return { barber, service, days: result };
  });
}

async function freeStarts(db, barber, service, date) {
  const weekday = weekdayFromIsoDate(date);
  const schedule = await getScheduleForDay(db, barber.id, weekday);
  if (!schedule) {
    return [];
  }

  const bookings = await listConfirmedBookings(db, barber.id, date);
  const starts = [];
  for (
    let cursor = timeToMinutes(schedule.startTime);
    cursor + service.durationMinutes <= timeToMinutes(schedule.endTime);
    cursor += SHOP.slotStepMinutes
  ) {
    const startTime = minutesToTime(cursor);
    const endTime = addMinutes(startTime, service.durationMinutes);
    if (isPastSlot(date, startTime)) {
      continue;
    }
    const busy = bookings.some(
      (booking) => booking.startTime < endTime && booking.endTime > startTime,
    );
    if (!busy) {
      starts.push(startTime);
    }
  }
  return starts;
}

export async function createBooking(input) {
  const booking = await withTransaction(async (db) => {
    const { barber, service } = await loadOpenPair(db, input.barberId, input.serviceId);

    const date = String(input.date || "");
    const startTime = String(input.startTime || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      throw new BookingError("Укажите день и время");
    }

    const endTime = addMinutes(startTime, service.durationMinutes);
    const weekday = weekdayFromIsoDate(date);
    const schedule = await getScheduleForDay(db, barber.id, weekday);
    if (!schedule) {
      throw new BookingError("Барбер в этот день не работает", 409);
    }
    if (
      timeToMinutes(startTime) < timeToMinutes(schedule.startTime) ||
      timeToMinutes(endTime) > timeToMinutes(schedule.endTime)
    ) {
      throw new BookingError("Это время вне смены барбера", 409);
    }
    if (isPastSlot(date, startTime)) {
      throw new BookingError("Это время уже прошло", 409);
    }

    const overlap = (await listConfirmedBookings(db, barber.id, date)).some(
      (item) => item.startTime < endTime && item.endTime > startTime,
    );
    if (overlap) {
      throw new BookingError("Этот слот уже занят", 409);
    }

    const source = input.source === "telegram" ? "telegram" : "site";
    return await insertBooking(db, {
      barberId: barber.id,
      serviceId: service.id,
      date,
      startTime,
      endTime,
      clientName: normalizeName(input.clientName),
      clientPhone: normalizePhone(input.clientPhone),
      source,
      telegramUserId: input.telegramUserId ? String(input.telegramUserId) : null,
      telegramChatId: input.telegramChatId ? String(input.telegramChatId) : null,
      createdAt: new Date().toISOString(),
    });
  });

  if (input.notify !== false) {
    await notifyNewBooking(booking);
  }
  return booking;
}

export async function cancelBooking(id, { by, telegramUserId } = {}) {
  const booking = await withTransaction(async (db) => {
    const current = await getBooking(db, Number(id));
    if (!current || current.status !== "confirmed") {
      throw new BookingError("Запись не найдена", 404);
    }
    if (by === "telegram" && current.telegramUserId !== String(telegramUserId)) {
      throw new BookingError("Можно отменить только свою запись", 403);
    }
    return cancelBookingRow(db, current.id);
  });

  if (by !== "seed") {
    await notifyCancelledBooking(booking, by === "admin" ? "admin" : "client");
  }
  return booking;
}

export async function getClientBookings(telegramUserId) {
  return withDb((db) => listBookingsByTelegramUser(db, telegramUserId));
}

export async function createBarber({ name, schedules }) {
  return withTransaction((db) => insertBarber(db, prepareBarber(name, schedules)));
}

export async function editBarber(id, payload) {
  return withTransaction(async (db) => {
    const current = await getBarber(db, Number(id));
    if (!current) {
      throw new BookingError("Барбер не найден", 404);
    }
    const next = {
      name: payload.name !== undefined ? normalizeName(payload.name) : undefined,
      active: payload.active,
      schedules:
        payload.schedules !== undefined
          ? prepareBarber(payload.name || current.name, payload.schedules).schedules
          : undefined,
    };
    return updateBarber(db, current.id, next);
  });
}

function prepareBarber(name, schedules) {
  const cleanName = normalizeName(name);
  if (!Array.isArray(schedules) || schedules.length === 0) {
    throw new BookingError("Укажите хотя бы один рабочий день");
  }
  const clean = schedules.map((item) => {
    const weekday = Number(item.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new BookingError("Неверный день недели");
    }
    const startTime = String(item.startTime).slice(0, 5);
    const endTime = String(item.endTime).slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BookingError("Укажите время смены");
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      throw new BookingError("Конец смены должен быть позже начала");
    }
    return {
      weekday,
      startTime,
      endTime,
    };
  });
  return { name: cleanName, schedules: clean };
}

export async function listAdminBarbers() {
  return withDb((db) => listBarbers(db));
}
