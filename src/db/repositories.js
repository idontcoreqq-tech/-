export async function listServices(db) {
  return db.all(
    `SELECT id, name, duration_minutes AS "durationMinutes", price
     FROM services ORDER BY id`,
  );
}

export async function getService(db, id) {
  return db.get(
    `SELECT id, name, duration_minutes AS "durationMinutes", price
     FROM services WHERE id = $1`,
    [id],
  );
}

export async function listBarbers(db, { activeOnly = false } = {}) {
  const sql = activeOnly
    ? "SELECT id, name, active FROM barbers WHERE active = 1 ORDER BY id"
    : "SELECT id, name, active FROM barbers ORDER BY id";
  const rows = await db.all(sql);
  return Promise.all(rows.map((row) => mapBarber(db, row)));
}

export async function getBarber(db, id) {
  const row = await db.get("SELECT id, name, active FROM barbers WHERE id = $1", [id]);
  return row ? mapBarber(db, row) : null;
}

async function mapBarber(db, row) {
  const schedules = await db.all(
    `SELECT weekday, start_time AS "startTime", end_time AS "endTime"
     FROM schedules WHERE barber_id = $1 ORDER BY weekday`,
    [row.id],
  );
  return {
    ...row,
    active: Boolean(row.active),
    schedules,
  };
}

export async function insertBarber(db, { name, schedules }) {
  const inserted = await db.get(
    "INSERT INTO barbers (name, active) VALUES ($1, 1) RETURNING id",
    [name],
  );
  const barberId = Number(inserted.id);
  await replaceSchedules(db, barberId, schedules);
  return getBarber(db, barberId);
}

export async function updateBarber(db, id, { name, schedules, active }) {
  if (name !== undefined) {
    await db.run("UPDATE barbers SET name = $1 WHERE id = $2", [name, id]);
  }
  if (active !== undefined) {
    await db.run("UPDATE barbers SET active = $1 WHERE id = $2", [active ? 1 : 0, id]);
  }
  if (schedules) {
    await replaceSchedules(db, id, schedules);
  }
  return getBarber(db, id);
}

async function replaceSchedules(db, barberId, schedules) {
  await db.run("DELETE FROM schedules WHERE barber_id = $1", [barberId]);
  for (const item of schedules) {
    await db.run(
      `INSERT INTO schedules (barber_id, weekday, start_time, end_time)
       VALUES ($1, $2, $3, $4)`,
      [barberId, item.weekday, item.startTime, item.endTime],
    );
  }
}

export async function getScheduleForDay(db, barberId, weekday) {
  return db.get(
    `SELECT weekday, start_time AS "startTime", end_time AS "endTime"
     FROM schedules WHERE barber_id = $1 AND weekday = $2`,
    [barberId, weekday],
  );
}

export async function listConfirmedBookings(db, barberId, date) {
  return db.all(
    `SELECT id, barber_id AS "barberId", service_id AS "serviceId", date,
            start_time AS "startTime", end_time AS "endTime",
            client_name AS "clientName", client_phone AS "clientPhone",
            source, status, telegram_user_id AS "telegramUserId"
     FROM bookings
     WHERE barber_id = $1 AND date = $2 AND status = 'confirmed'
     ORDER BY start_time`,
    [barberId, date],
  );
}

const BOOKING_SELECT = `
  SELECT b.id, b.barber_id AS "barberId", b.service_id AS "serviceId", b.date,
         b.start_time AS "startTime", b.end_time AS "endTime",
         b.client_name AS "clientName", b.client_phone AS "clientPhone",
         b.source, b.status, b.telegram_user_id AS "telegramUserId",
         b.telegram_chat_id AS "telegramChatId", b.created_at AS "createdAt",
         b.remind_hour_at AS "remindHourAt", b.remind_soon_at AS "remindSoonAt",
         br.name AS "barberName", s.name AS "serviceName",
         s.duration_minutes AS "durationMinutes", s.price
  FROM bookings b
  JOIN barbers br ON br.id = b.barber_id
  JOIN services s ON s.id = b.service_id
`;

export async function listBookingsInRange(db, fromDate, toDate) {
  return db.all(
    `${BOOKING_SELECT}
     WHERE b.date >= $1 AND b.date <= $2
     ORDER BY b.date, b.start_time`,
    [fromDate, toDate],
  );
}

export async function listBookingsByTelegramUser(db, telegramUserId) {
  return db.all(
    `${BOOKING_SELECT}
     WHERE b.telegram_user_id = $1 AND b.status = 'confirmed'
     ORDER BY b.date, b.start_time`,
    [String(telegramUserId)],
  );
}

export async function getBooking(db, id) {
  return db.get(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
}

export async function insertBooking(db, booking) {
  const inserted = await db.get(
    `INSERT INTO bookings (
      barber_id, service_id, date, start_time, end_time, client_name, client_phone,
      source, status, telegram_user_id, telegram_chat_id, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, $10, $11)
    RETURNING id`,
    [
      booking.barberId,
      booking.serviceId,
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.clientName,
      booking.clientPhone,
      booking.source,
      booking.telegramUserId ?? null,
      booking.telegramChatId ?? null,
      booking.createdAt,
    ],
  );
  return getBooking(db, Number(inserted.id));
}

export async function cancelBookingRow(db, id) {
  await db.run("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
  return getBooking(db, id);
}

export async function listConfirmedFrom(db, fromDate) {
  return db.all(
    `${BOOKING_SELECT}
     WHERE b.status = 'confirmed' AND b.date >= $1
     ORDER BY b.date, b.start_time`,
    [fromDate],
  );
}

export async function claimReminder(db, id, kind) {
  const column = reminderColumn(kind);
  const result = await db.run(
    `UPDATE bookings SET ${column} = $1
     WHERE id = $2 AND ${column} IS NULL AND status = 'confirmed'`,
    [new Date().toISOString(), id],
  );
  return result.rowCount === 1;
}

export async function releaseReminder(db, id, kind) {
  const column = reminderColumn(kind);
  await db.run(`UPDATE bookings SET ${column} = NULL WHERE id = $1`, [id]);
}

function reminderColumn(kind) {
  if (kind === "hour") {
    return "remind_hour_at";
  }
  if (kind === "soon") {
    return "remind_soon_at";
  }
  throw new Error("Неизвестный тип напоминания");
}

export async function countBarbers(db) {
  const row = await db.get("SELECT COUNT(*)::int AS count FROM barbers");
  return row.count;
}
