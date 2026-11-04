"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, formatDateLabel, shopNowParts, weekdayFromIsoDate } from "@/lib/shop";

const WEEK_HEAD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function monthKey(iso) {
  return iso.slice(0, 7);
}

function shiftMonth(iso, amount) {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1, 12)).toISOString().slice(0, 10);
}

function monthTitle(iso) {
  const [year, month] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function buildCells(monthIso) {
  const [year, month] = monthIso.split("-").map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = `${monthIso.slice(0, 7)}-01`;
  const lead = (weekdayFromIsoDate(first) + 6) % 7;
  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${monthIso.slice(0, 7)}-${String(day).padStart(2, "0")}`);
  }
  return cells;
}

export function MiniApp() {
  const [catalog, setCatalog] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [barberId, setBarberId] = useState(null);
  const [month, setMonth] = useState(null);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [initData, setInitData] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        setCatalog(data);
        setMonth(`${data.today.slice(0, 7)}-01`);
      });
  }, []);

  useEffect(() => {
    let stopped = false;
    function boot() {
      const tg = window.Telegram?.WebApp;
      if (!tg || stopped) {
        return;
      }
      tg.ready();
      tg.expand();
      setInitData(tg.initData || "");
      const user = tg.initDataUnsafe?.user;
      if (user) {
        const telegramName = [user.first_name, user.last_name].filter(Boolean).join(" ");
        setName((current) => current || telegramName);
      }
      const theme = tg.themeParams || {};
      const root = document.documentElement;
      const paint = [
        ["--tile", theme.bg_color],
        ["--paper", theme.secondary_bg_color || theme.bg_color],
        ["--card", theme.secondary_bg_color || theme.bg_color],
        ["--ink", theme.text_color],
        ["--muted", theme.hint_color],
        ["--wine", theme.button_color],
        ["--line", theme.section_separator_color],
      ];
      for (const [token, value] of paint) {
        if (value) {
          root.style.setProperty(token, value);
        }
      }
      if (theme.bg_color) {
        root.style.background = theme.bg_color;
        document.body.style.background = theme.bg_color;
      }
    }
    boot();
    if (!window.Telegram?.WebApp) {
      const src = "https://telegram.org/js/telegram-web-app.js";
      let script = document.querySelector(`script[src="${src}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", boot);
    }
    const timer = setInterval(boot, 250);
    const stop = setTimeout(() => clearInterval(timer), 4000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    if (!serviceId || !barberId || !month || !catalog?.today) {
      return;
    }
    const monthEnd = addDays(shiftMonth(month, 1), -1);
    const fromDate = month < catalog.today ? catalog.today : month;
    if (fromDate > monthEnd) {
      setSlotsByDate({});
      return;
    }
    const span = Math.round(
      (Date.parse(`${monthEnd}T12:00:00Z`) - Date.parse(`${fromDate}T12:00:00Z`)) / 86400000,
    ) + 1;
    const query = new URLSearchParams({
      barberId: String(barberId),
      serviceId: String(serviceId),
      fromDate,
      days: String(span),
    });
    fetch(`/api/slots?${query}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        const next = {};
        for (const day of data.days || []) {
          next[day.date] = day.slots;
        }
        setSlotsByDate(next);
      });
  }, [serviceId, barberId, month, catalog]);

  const cells = useMemo(() => (month ? buildCells(month) : []), [month]);
  const times = selectedDate ? slotsByDate[selectedDate] || [] : [];
  const today = catalog?.today || shopNowParts().date;
  const service = catalog?.services.find((item) => item.id === serviceId);
  const barber = catalog?.barbers.find((item) => item.id === barberId);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          serviceId,
          barberId,
          date: selectedDate,
          startTime,
          clientName: name,
          clientPhone: phone,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Не получилось записать");
        return;
      }
      setDone(data);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    } catch {
      setError("Не получилось записать");
    } finally {
      setPending(false);
    }
  }

  if (!catalog || !month) {
    return <p className="px-4 py-8 text-muted">Открываем календарь…</p>;
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="font-display text-4xl">Вы записаны</h1>
        <p className="mt-4 text-lg">
          {done.serviceName}, {done.barberName}
        </p>
        <p className="mt-2">
          {formatDateLabel(done.date)}, {done.startTime}–{done.endTime}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-5 pb-10">
      <h1 className="font-display text-4xl">Календарь</h1>
      <p className="mt-2 text-muted">Услуга, мастер, затем свободный день.</p>

      <section className="mt-6">
        <h2 className="font-display text-2xl">Услуга</h2>
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

      <section className="mt-6">
        <h2 className="font-display text-2xl">Мастер</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.barbers.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              data-active={item.id === barberId}
              onClick={() => {
                setBarberId(item.id);
                setSelectedDate(null);
                setStartTime(null);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl capitalize">{monthTitle(month)}</h2>
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} disabled={monthKey(month) <= monthKey(today)}>
              Назад
            </button>
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))}>
              Дальше
            </button>
          </div>
        </div>
        <div className="cal-grid mt-3">
          {WEEK_HEAD.map((label) => (
            <span key={label} className="cal-head">
              {label}
            </span>
          ))}
          {cells.map((date, index) => {
            if (!date) {
              return <span key={`empty-${index}`} />;
            }
            const open = (slotsByDate[date] || []).length > 0;
            const past = date < today;
            return (
              <button
                key={date}
                type="button"
                className="cal-day"
                disabled={!open || past}
                data-open={open}
                data-active={selectedDate === date}
                onClick={() => {
                  setSelectedDate(date);
                  setStartTime(null);
                }}
              >
                {Number(date.slice(8))}
              </button>
            );
          })}
        </div>
        {service && barber ? null : (
          <p className="mt-3 text-sm text-muted">Выберите услугу и мастера, чтобы увидеть свободные дни.</p>
        )}
      </section>

      {selectedDate ? (
        <section className="mt-6">
          <h2 className="font-display text-2xl">{formatDateLabel(selectedDate)}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {times.map((time) => (
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
        </section>
      ) : null}

      {startTime ? (
        <form className="mt-6 grid gap-3" onSubmit={submit}>
          <p>
            {service.name}, {barber.name}, {formatDateLabel(selectedDate)}, {startTime}
          </p>
          <label className="grid gap-1">
            <span>Имя</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} className="field" />
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
          {!initData ? (
            <p className="text-sm text-muted">Подтвердить запись можно только из бота.</p>
          ) : null}
          {error ? <p className="text-wine">{error}</p> : null}
          <button type="submit" className="btn-gold" disabled={pending || !initData}>
            {pending ? "Сохраняем запись…" : "Подтвердить запись"}
          </button>
        </form>
      ) : null}

      {error && !startTime ? <p className="mt-4 text-wine">{error}</p> : null}
    </main>
  );
}
