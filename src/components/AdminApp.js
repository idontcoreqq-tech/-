"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "./AdminGate";
import { addDays, formatDateLabel, WEEKDAY_LABELS, weekdayFromIsoDate } from "@/lib/shop";
import { requestJson } from "@/lib/apiClient";

const MAIN = "mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-10";

export function AdminApp() {
  return (
    <AdminGate mainClassName={MAIN}>
      <WorkloadScreen />
    </AdminGate>
  );
}

function minutesLabel(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours === 0) {
    return `${minutes} мин`;
  }
  return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

function WorkloadScreen() {
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remindingId, setRemindingId] = useState(null);

  useEffect(() => {
    const query = weekStart ? `?weekStart=${weekStart}` : "";
    requestJson(`/api/admin/workload${query}`)
      .then((payload) => {
        setData(payload);
        setWeekStart(payload.weekStart);
        setError("");
      })
      .catch((loadError) => setError(loadError.message));
  }, [weekStart]);

  async function remind(id) {
    setRemindingId(id);
    try {
      await requestJson(`/api/admin/bookings/${id}/remind`, { method: "POST" });
      setNotice("Напоминание отправлено в Telegram");
      setError("");
    } catch (remindError) {
      setError(remindError.message);
      setNotice("");
    } finally {
      setRemindingId(null);
    }
  }

  async function cancel(id) {
    try {
      await requestJson(`/api/admin/bookings/${id}`, { method: "POST" });
      const query = weekStart ? `?weekStart=${weekStart}` : "";
      setData(await requestJson(`/api/admin/workload${query}`));
      setError("");
    } catch (cancelError) {
      setError(cancelError.message);
    }
  }

  if (!data) {
    return error ? <p className="text-wine">{error}</p> : <p className="text-muted">Считаем смены…</p>;
  }

  return (
    <WorkloadBoard
      data={data}
      onWeek={setWeekStart}
      onCancel={cancel}
      onRemind={remind}
      remindingId={remindingId}
      error={error}
      notice={notice}
    />
  );
}

function WorkloadBoard({ data, onWeek, onCancel, onRemind, remindingId, error, notice }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Нагрузка</h1>
          <p className="mt-2 text-muted">Неделя с {formatDateLabel(data.weekStart)}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => onWeek(addDays(data.weekStart, -7))}>
            Прошлая
          </button>
          <button type="button" onClick={() => onWeek(addDays(data.weekStart, 7))}>
            Следующая
          </button>
        </div>
      </div>
      {error ? <p className="mt-4 text-wine">{error}</p> : null}
      {notice ? <p className="mt-4 text-muted">{notice}</p> : null}
      <div className="mt-8 space-y-8">
        {data.barbers.map((barber) => (
          <article key={barber.id} className="sheet p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">{barber.name}</h2>
                {!barber.active ? <p className="text-sm text-muted">Скрыт из записи</p> : null}
              </div>
              <p className="text-sm text-muted">
                {minutesLabel(barber.weekBookedMinutes)} из {minutesLabel(barber.weekShiftMinutes)} ·{" "}
                {Math.round(barber.weekLoad * 100)}%
              </p>
            </div>
            <div className="load-bar mt-3">
              <span style={{ width: `${Math.round(barber.weekLoad * 100)}%` }} />
            </div>
            <div className="week-scroll mt-5 grid min-w-[52rem] gap-4 md:grid-cols-7">
              {barber.days.map((day) => (
                <div key={day.date}>
                  <p className="text-sm">
                    {WEEKDAY_LABELS[weekdayFromIsoDate(day.date)]}{" "}
                    <span className="text-muted">{formatDateLabel(day.date)}</span>
                  </p>
                  {day.working ? (
                    <>
                      <div className="load-bar mt-2">
                        <span style={{ width: `${Math.round(day.load * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {minutesLabel(day.bookedMinutes)} / {minutesLabel(day.shiftMinutes)}
                      </p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {day.bookings.map((booking) => (
                          <li key={booking.id}>
                            <p>
                              {booking.startTime}–{booking.endTime}
                            </p>
                            <p className="text-muted">{booking.clientName}</p>
                            <p className="text-muted">{booking.serviceName}</p>
                            <button
                              type="button"
                              className="mr-3 text-sm"
                              disabled={remindingId === booking.id}
                              onClick={() => onRemind(booking.id)}
                            >
                              {remindingId === booking.id ? "Отправляем…" : "Напомнить"}
                            </button>
                            <button
                              type="button"
                              className="text-wine"
                              onClick={() => onCancel(booking.id)}
                            >
                              Отменить
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Выходной</p>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
