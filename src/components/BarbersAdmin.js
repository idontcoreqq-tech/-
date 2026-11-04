"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "./AdminGate";
import { requestJson } from "@/lib/apiClient";
import { WEEKDAY_FULL } from "@/lib/shop";

const EMPTY_DAY = { enabled: false, startTime: "10:00", endTime: "20:00" };
const MAIN = "mx-auto max-w-4xl px-5 pb-16 pt-28 md:px-10";

function fromSchedules(schedules = []) {
  return WEEKDAY_FULL.map((_, weekday) => {
    const found = schedules.find((item) => item.weekday === weekday);
    return found
      ? { enabled: true, startTime: found.startTime, endTime: found.endTime }
      : { ...EMPTY_DAY };
  });
}

function toSchedules(days) {
  return days
    .map((day, weekday) =>
      day.enabled ? { weekday, startTime: day.startTime, endTime: day.endTime } : null,
    )
    .filter(Boolean);
}

export function BarbersAdmin() {
  return (
    <AdminGate mainClassName={MAIN}>
      <BarberScreen />
    </AdminGate>
  );
}

function BarberScreen() {
  const [barbers, setBarbers] = useState([]);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    days: fromSchedules([]),
  });

  async function reload() {
    const payload = await requestJson("/api/admin/barbers");
    setBarbers(payload.barbers);
  }

  useEffect(() => {
    reload().catch((loadError) => setError(loadError.message));
  }, []);

  async function createBarber(event) {
    event.preventDefault();
    try {
      await requestJson("/api/admin/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          schedules: toSchedules(draft.days),
        }),
      });
      setDraft({ name: "", days: fromSchedules([]) });
      setError("");
      await reload();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveBarber(barber, days) {
    try {
      await requestJson(`/api/admin/barbers/${barber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: barber.name,
          schedules: toSchedules(days),
        }),
      });
      setError("");
      await reload();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function toggleActive(barber) {
    try {
      await requestJson(`/api/admin/barbers/${barber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !barber.active }),
      });
      setError("");
      await reload();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <>
      <h1 className="font-display text-5xl">Барберы</h1>
      {error ? <p className="mt-4 text-wine">{error}</p> : null}
      <form className="sheet mt-10 p-6 md:p-8" onSubmit={createBarber}>
        <h2 className="font-display text-3xl">Новый мастер</h2>
        <label className="mt-6 grid gap-2">
          <span>Имя</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className="field"
          />
        </label>
        <DayEditor days={draft.days} onChange={(days) => setDraft({ ...draft, days })} />
        <button type="submit" className="btn-gold mt-6">
          Добавить
        </button>
      </form>
      <div className="mt-8 space-y-6">
        {barbers.map((barber) => (
          <BarberEditor key={barber.id} barber={barber} onSave={saveBarber} onToggle={toggleActive} />
        ))}
      </div>
    </>
  );
}

function BarberEditor({ barber, onSave, onToggle }) {
  const [name, setName] = useState(barber.name);
  const [days, setDays] = useState(fromSchedules(barber.schedules));

  useEffect(() => {
    setName(barber.name);
    setDays(fromSchedules(barber.schedules));
  }, [barber]);

  return (
    <form
      className="sheet p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...barber, name }, days);
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid flex-1 gap-2">
          <span>Имя</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="field" />
        </label>
        <button type="button" className="text-sm font-semibold text-wine" onClick={() => onToggle(barber)}>
          {barber.active ? "Скрыть из записи" : "Вернуть в запись"}
        </button>
      </div>
      <DayEditor days={days} onChange={setDays} />
      <button type="submit" className="btn-outline mt-5">
        Сохранить смену
      </button>
    </form>
  );
}

function DayEditor({ days, onChange }) {
  function patch(weekday, change) {
    const next = days.slice();
    next[weekday] = { ...days[weekday], ...change };
    onChange(next);
  }

  return (
    <ul className="mt-4 space-y-2">
      {days.map((day, weekday) => (
        <li key={weekday} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
          <input
            type="checkbox"
            checked={day.enabled}
            onChange={(event) => patch(weekday, { enabled: event.target.checked })}
          />
          <span>{WEEKDAY_FULL[weekday]}</span>
          <input
            type="time"
            value={day.startTime}
            disabled={!day.enabled}
            onChange={(event) => patch(weekday, { startTime: event.target.value })}
            className="field disabled:opacity-40"
          />
          <input
            type="time"
            value={day.endTime}
            disabled={!day.enabled}
            onChange={(event) => patch(weekday, { endTime: event.target.value })}
            className="field disabled:opacity-40"
          />
        </li>
      ))}
    </ul>
  );
}
