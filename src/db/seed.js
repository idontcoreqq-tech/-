import {
  addDays,
  addMinutes,
  shopNowParts,
  timeToMinutes,
  weekdayFromIsoDate,
} from "../lib/shop.js";

const SERVICES = [
  { name: "Стрижка", durationMinutes: 45, price: 150000 },
  { name: "Машинкой", durationMinutes: 30, price: 90000 },
  { name: "Борода", durationMinutes: 30, price: 80000 },
  { name: "Стрижка и борода", durationMinutes: 75, price: 210000 },
];

const BARBERS = [
  {
    name: "Артём Волков",
    schedules: weekdayRange(1, 5, "10:00", "20:00").concat([
      { weekday: 6, startTime: "11:00", endTime: "18:00" },
    ]),
  },
  {
    name: "Илья Морозов",
    schedules: weekdayRange(2, 6, "12:00", "21:00"),
  },
  {
    name: "Кирилл Белов",
    schedules: [1, 3, 5, 6].map((weekday) => ({
      weekday,
      startTime: "10:00",
      endTime: "19:00",
    })),
  },
  {
    name: "Марат Сафин",
    schedules: [4, 5, 6, 0].map((weekday) => ({
      weekday,
      startTime: "11:00",
      endTime: "20:00",
    })),
  },
];

const CLIENTS = [
  { name: "Павел Орлов", phone: "+998905551201" },
  { name: "Денис Жуков", phone: "+998905551202" },
  { name: "Никита Соколов", phone: "+998905551203" },
  { name: "Роман Лебедев", phone: "+998905551204" },
  { name: "Антон Крылов", phone: "+998905551205" },
  { name: "Егор Панов", phone: "+998905551206" },
  { name: "Максим Ильин", phone: "+998905551207" },
  { name: "Станислав Юдин", phone: "+998905551208" },
  { name: "Глеб Воронов", phone: "+998905551209" },
  { name: "Тимур Алексеев", phone: "+998905551210" },
  { name: "Вадим Новиков", phone: "+998905551211" },
  { name: "Сергей Котов", phone: "+998905551212" },
  { name: "Иван Петров", phone: "+998905551213" },
  { name: "Олег Баринов", phone: "+998905551214" },
  { name: "Андрей Фомин", phone: "+998905551215" },
];

function weekdayRange(from, to, startTime, endTime) {
  const days = [];
  for (let weekday = from; weekday <= to; weekday += 1) {
    days.push({ weekday, startTime, endTime });
  }
  return days;
}

export async function seedIfEmpty(db) {
  const count = await db.get("SELECT COUNT(*)::int AS count FROM barbers");
  if (count.count > 0) {
    return;
  }

  const serviceIds = [];
  for (const service of SERVICES) {
    const inserted = await db.get(
      "INSERT INTO services (name, duration_minutes, price) VALUES ($1, $2, $3) RETURNING id",
      [service.name, service.durationMinutes, service.price],
    );
    serviceIds.push(Number(inserted.id));
  }

  const barberIds = [];
  for (const barber of BARBERS) {
    const inserted = await db.get(
      "INSERT INTO barbers (name, active) VALUES ($1, 1) RETURNING id",
      [barber.name],
    );
    const id = Number(inserted.id);
    for (const schedule of barber.schedules) {
      await db.run(
        "INSERT INTO schedules (barber_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)",
        [id, schedule.weekday, schedule.startTime, schedule.endTime],
      );
    }
    barberIds.push(id);
  }

  const today = shopNowParts().date;
  const occupied = new Map();
  let clientIndex = 0;
  const preferredStarts = ["11:00", "12:30", "14:00", "15:30", "17:00", "18:30"];

  for (let offset = 0; offset < 10 && clientIndex < CLIENTS.length; offset += 1) {
    const date = addDays(today, offset);
    const weekday = weekdayFromIsoDate(date);

    for (let barberIndex = 0; barberIndex < barberIds.length; barberIndex += 1) {
      if (clientIndex >= CLIENTS.length) {
        break;
      }
      if ((offset + barberIndex) % 2 === 1 && clientIndex > 4) {
        continue;
      }

      const barberId = barberIds[barberIndex];
      const schedule = BARBERS[barberIndex].schedules.find((item) => item.weekday === weekday);
      if (!schedule) {
        continue;
      }

      const serviceIndex = (clientIndex + barberIndex) % SERVICES.length;
      const service = SERVICES[serviceIndex];
      const startTime = preferredStarts[(clientIndex + offset) % preferredStarts.length];
      const endTime = addMinutes(startTime, service.durationMinutes);
      if (
        timeToMinutes(startTime) < timeToMinutes(schedule.startTime) ||
        timeToMinutes(endTime) > timeToMinutes(schedule.endTime)
      ) {
        continue;
      }

      const key = `${barberId}:${date}`;
      const taken = occupied.get(key) ?? [];
      const overlaps = taken.some(
        (slot) => slot.start < endTime && slot.end > startTime,
      );
      if (overlaps) {
        continue;
      }

      const client = CLIENTS[clientIndex];
      await db.run(
        `INSERT INTO bookings (
          barber_id, service_id, date, start_time, end_time, client_name, client_phone,
          source, status, telegram_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'site', 'confirmed', NULL, $8)`,
        [
          barberId,
          serviceIds[serviceIndex],
          date,
          startTime,
          endTime,
          client.name,
          client.phone,
          new Date().toISOString(),
        ],
      );
      taken.push({ start: startTime, end: endTime });
      occupied.set(key, taken);
      clientIndex += 1;
    }
  }
}
