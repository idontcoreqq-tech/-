import { withDb } from "../db/connection.js";
import { getScheduleForDay, listBarbers, listBookingsInRange } from "../db/repositories.js";
import {
  addDays,
  mondayOf,
  shopNowParts,
  timeToMinutes,
  weekdayFromIsoDate,
} from "../lib/shop.js";

export async function getWorkload(weekStart) {
  return withDb(async (db) => {
    const from = mondayOf(weekStart || shopNowParts().date);
    const dates = Array.from({ length: 7 }, (_, index) => addDays(from, index));
    const barbers = await listBarbers(db);
    const bookings = (await listBookingsInRange(db, from, addDays(from, 6))).filter(
      (item) => item.status === "confirmed",
    );

    const rows = [];
    for (const barber of barbers) {
      const days = [];
      for (const date of dates) {
        const schedule = await getScheduleForDay(db, barber.id, weekdayFromIsoDate(date));
        const dayBookings = bookings.filter(
          (item) => item.barberId === barber.id && item.date === date,
        );
        const shiftMinutes = schedule
          ? timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)
          : 0;
        const bookedMinutes = dayBookings.reduce(
          (sum, item) => sum + (timeToMinutes(item.endTime) - timeToMinutes(item.startTime)),
          0,
        );
        days.push({
          date,
          working: Boolean(schedule),
          schedule,
          shiftMinutes,
          bookedMinutes,
          load: shiftMinutes === 0 ? 0 : Math.min(1, bookedMinutes / shiftMinutes),
          bookings: dayBookings,
        });
      }

      const weekShift = days.reduce((sum, day) => sum + day.shiftMinutes, 0);
      const weekBooked = days.reduce((sum, day) => sum + day.bookedMinutes, 0);
      rows.push({
        ...barber,
        days,
        weekShiftMinutes: weekShift,
        weekBookedMinutes: weekBooked,
        weekLoad: weekShift === 0 ? 0 : Math.min(1, weekBooked / weekShift),
      });
    }

    return {
      weekStart: from,
      dates,
      barbers: rows,
    };
  });
}
