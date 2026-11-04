"use client";

import { useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/apiClient";
import { addDays, formatDateLabel, WEEKDAY_LABELS, weekdayFromIsoDate } from "@/lib/shop";

export function BookingSheet() {
  const [catalog, setCatalog] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [barberId, setBarberId] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        setCatalog(data);
        setWeekStart(data.today);
      });
  }, []);

  useEffect(() => {
    if (!serviceId || !barberId || !weekStart) {
      return;
    }
    const query = new URLSearchParams({
      barberId: String(barberId),
      serviceId: String(serviceId),
      fromDate: weekStart,
      days: "7",
    });
    fetch(`/api/slots?${query}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setDays(data.days);
        setSelectedDate((current) => {
          if (current && data.days.some((day) => day.date === current && day.slots.length)) {
            return current;
          }
          return data.days.find((day) => day.slots.length)?.date ?? null;
        });
        setStartTime(null);
      });
  }, [serviceId, barberId, weekStart]);

  const service = catalog?.services.find((item) => item.id === serviceId);
  const barber = catalog?.barbers.find((item) => item.id === barberId);
  const activeDay = days.find((day) => day.date === selectedDate);
  const selectedSlots = useMemo(() => activeDay?.slots ?? [], [activeDay]);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await requestJson("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          barberId,
          date: selectedDate,
          startTime,
          clientName: name,
          clientPhone: phone,
        }),
      });
      setDone(data);
    } catch (submitError) {
      setError(submitError.message || "Не получилось записать");
    } finally {
      setPending(false);
    }
  }

  if (!catalog) {
    return <p className="text-muted">Загружаем свободные слоты…</p>;
  }

  if (done) {
    return (
      <div className="sheet p-8 md:p-12">
        <h2 className="font-display text-4xl">Вы записаны</h2>
        <p className="mt-4 text-lg">
          {done.serviceName}, {done.barberName}
        </p>
        <p className="mt-2">
          {done.date}, {done.startTime}–{done.endTime}
        </p>
        <p className="mt-6 text-muted">
          {done.clientName}, {done.clientPhone}
        </p>
      </div>
    );
  }

  return (
    <div className="sheet p-6 md:p-10">
      <h2 className="font-display text-4xl md:text-5xl">Выберите слот</h2>
      <p className="mt-3 max-w-lg text-muted">
        Сначала услуга и мастер, затем день и время.
      </p>

      <section className="mt-8">
        <h3 className="font-display text-2xl">Услуга</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.services.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              data-active={item.id === serviceId}
              onClick={() => {
                setServiceId(item.id);
                setStartTime(null);
              }}
            >
              {item.name}, {item.durationMinutes} мин
            </button>
          ))}
        </div>
      </section>

      {service ? (
        <section className="mt-8">
          <h3 className="font-display text-2xl">Барбер</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {catalog.barbers.map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip"
                data-active={item.id === barberId}
                onClick={() => {
                  setBarberId(item.id);
                  setStartTime(null);
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {service && barber ? (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-2xl">День</h3>
            <div className="flex gap-4 text-sm">
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                Прошлая неделя
              </button>
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                Следующая
              </button>
            </div>
          </div>
          <div className="day-strip mt-4">
            {days.map((day) => (
              <button
                key={day.date}
                type="button"
                disabled={day.slots.length === 0}
                className="chip shrink-0 disabled:opacity-40"
                data-active={selectedDate === day.date}
                onClick={() => {
                  setSelectedDate(day.date);
                  setStartTime(null);
                }}
              >
                {WEEKDAY_LABELS[weekdayFromIsoDate(day.date)]} {formatDateLabel(day.date)}
              </button>
            ))}
          </div>
          <h3 className="mt-6 font-display text-2xl">Время</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {selectedSlots.map((time) => (
              <button
                key={time}
                type="button"
                className="slot-btn"
                data-active={startTime === time}
                onClick={() => setStartTime(time)}
              >
                {time}
              </button>
            ))}
          </div>
          {selectedDate && selectedSlots.length === 0 ? (
            <p className="mt-3 text-sm text-muted">В этот день свободных слотов нет. Выберите другой.</p>
          ) : null}
        </section>
      ) : null}

      {startTime ? (
        <form className="mt-10 grid gap-4 md:max-w-md" onSubmit={submit}>
          <p>
            {service.name}, {barber.name}, {formatDateLabel(selectedDate)}, {startTime}
          </p>
          <label className="grid gap-1">
            <span>Имя</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
            />
          </label>
          <label className="grid gap-1">
            <span>Телефон</span>
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field"
              placeholder="+998 90 123 45 67"
            />
          </label>
          {error ? <p className="text-wine">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn-gold justify-self-start">
            {pending ? "Сохраняем запись…" : "Подтвердить запись"}
          </button>
        </form>
      ) : null}

      {error && !startTime ? <p className="mt-4 text-wine">{error}</p> : null}
    </div>
  );
}
