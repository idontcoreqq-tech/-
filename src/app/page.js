import Link from "next/link";
import { HeroVideo } from "@/components/HeroVideo";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCatalog } from "@/domain/bookingService";
import { PHOTOS, REVIEWS } from "@/lib/media";
import { formatPrice, SHOP, WEEKDAY_LABELS } from "@/lib/shop";

export const dynamic = "force-dynamic";

const ICONS = [
  "M4 14c2-6 8-6 10 0M6 14h6M9 6v3",
  "M5 7h8v8H5zM13 9h2v6h-2M7 7V5h4v2",
  "M5 13c1.5-4 6.5-4 8 0M7 13c.6-1.6 3.4-1.6 4 0",
  "M4 8h10M6 8c0 4 1 6 3 6s3-2 3-6",
];

const STEPS = [
  { title: "Услуга", text: "Стрижка, борода или машинка. Длительность задаёт длину слота." },
  { title: "Мастер", text: "В списке только те, кто работает в выбранный день." },
  { title: "День и время", text: "Календарь показывает свободные окна, без занятых и прошедших." },
  { title: "Подтверждение", text: "Имя и телефон. Запись сразу появляется в листе мастера." },
];

function shiftText(schedules) {
  const groups = new Map();
  for (const item of schedules) {
    const key = `${item.startTime}-${item.endTime}`;
    const list = groups.get(key) ?? [];
    list.push(WEEKDAY_LABELS[item.weekday]);
    groups.set(key, list);
  }
  return Array.from(groups.entries())
    .map(([hours, days]) => `${days.join(", ")} ${hours.replace("-", "–")}`)
    .join("; ");
}

export default async function HomePage() {
  const { services, barbers } = await getCatalog();
  const loop = [...services, ...services];

  return (
    <div>
      <SiteHeader tone="on-video" />
      <section className="hero-stage relative overflow-hidden px-5 pb-20 pt-32 md:px-10 md:pb-28 md:pt-40">
        <HeroVideo />
        <div className="relative z-[2] mx-auto max-w-6xl">
          <div className="max-w-xl">
            <p className="badge">Барбершоп на Вайнера</p>
            <h1 className="mt-5">
              <span className="gradient-text">Ровная линия</span>
              <br />
              в кресле на Вайнера
            </h1>
            <p className="lede mt-5">
              Стрижка, борода, машинка. Слот выбираете сами — на сайте или в Telegram.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-gold">
                Записаться
              </Link>
              <a href={SHOP.telegram} className="btn-outline" target="_blank" rel="noreferrer">
                Записаться в Telegram
              </a>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4">
              <div>
                <dt className="font-display text-3xl font-extrabold">{barbers.length}</dt>
                <dd className="text-sm text-muted">мастера</dd>
              </div>
              <div>
                <dt className="font-display text-3xl font-extrabold">{services.length}</dt>
                <dd className="text-sm text-muted">услуги</dd>
              </div>
              <div>
                <dt className="font-display text-3xl font-extrabold">30</dt>
                <dd className="text-sm text-muted">мин шаг слота</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="marquee py-4">
        <div className="marquee-track items-center text-sm font-semibold text-muted">
          {loop.map((service, index) => (
            <span key={`${service.id}-${index}`} className="px-2">
              {service.name} · {formatPrice(service.price)}
            </span>
          ))}
        </div>
      </div>

      <section id="story" className="px-5 py-20 md:px-10 md:py-28">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <img src={PHOTOS.story} alt="Мастер за работой" className="h-56 w-full rounded-2xl object-cover" />
            <img src={PHOTOS.cut} alt="Стрижка" className="mt-8 h-56 w-full rounded-2xl object-cover" />
          </div>
          <div>
            <div className="section-rule" />
            <h2 className="mt-4">Своя смена у каждого кресла</h2>
            <p className="lede mt-4">
              {SHOP.city}, {SHOP.address}. Четыре мастера, у каждого свои дни и часы. Запись занимает
              минуту.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li>Слот короче, чем услуга, в календарь не попадает</li>
              <li>Занятое и прошедшее время скрыто</li>
              <li>Новая запись и отмена дублируются в чат смены</li>
              <li>
                Телефон зала{" "}
                <a className="text-wine" href={`tel:${SHOP.phone.replace(/\D/g, "")}`}>
                  {SHOP.phone}
                </a>
              </li>
            </ul>
            <Link href="/book" className="btn-gold mt-8">
              Открыть календарь
            </Link>
          </div>
        </Reveal>
      </section>

      <section id="services" className="px-5 py-8 md:px-10">
        <Reveal className="mx-auto max-w-6xl">
          <div className="section-rule" />
          <h2 className="mt-4">Услуги</h2>
          <p className="lede mt-3">Цена в сумах. Длительность меняет свободные окна в календаре.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <article key={service.id} className="service-card">
                <div className="service-icon">
                  <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d={ICONS[index % ICONS.length]} />
                  </svg>
                </div>
                <h3 className="mt-4">{service.name}</h3>
                <p className="mt-2 text-sm text-muted">{service.durationMinutes} минут</p>
                <p className="mt-3 font-display text-xl font-extrabold">{formatPrice(service.price)}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-5 py-20 md:px-10">
        <Reveal className="mx-auto max-w-6xl">
          <div className="section-rule" />
          <h2 className="mt-4">Как проходит запись</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <article key={step.title} className="sheet p-5">
                <p className="font-display text-3xl font-extrabold text-wine">0{index + 1}</p>
                <h3 className="mt-3">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.text}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="barbers" className="px-5 pb-8 md:px-10">
        <Reveal className="mx-auto max-w-6xl">
          <div className="section-rule" />
          <h2 className="mt-4">Мастера</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {barbers.map((barber, index) => (
              <article key={barber.id} className="sheet overflow-hidden">
                <img
                  src={PHOTOS.barbers[index % PHOTOS.barbers.length]}
                  alt=""
                  className="h-64 w-full object-cover"
                />
                <div className="p-4">
                  <h3>{barber.name}</h3>
                  <p className="mt-2 text-sm text-muted">{shiftText(barber.schedules)}</p>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-5 py-20 md:px-10">
        <Reveal className="mx-auto max-w-6xl">
          <div className="section-rule" />
          <h2 className="mt-4">От гостей</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {REVIEWS.map((review) => (
              <blockquote key={review.name} className="sheet p-6">
                <p>«{review.text}»</p>
                <footer className="mt-5">
                  <p className="font-display font-bold">{review.name}</p>
                  <p className="text-sm text-muted">{review.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="price" className="px-5 pb-8 md:px-10">
        <Reveal className="mx-auto max-w-6xl">
          <div className="section-rule" />
          <h2 className="mt-4">Прайс</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article key={service.id} className="sheet p-6">
                <h3>{service.name}</h3>
                <p className="mt-4 font-display text-3xl font-extrabold">{formatPrice(service.price)}</p>
                <p className="mt-2 text-sm text-muted">{service.durationMinutes} минут</p>
                <Link href="/book" className="btn-outline mt-6">
                  Записаться
                </Link>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-5 py-16 md:px-10">
        <div className="cta-band mx-auto max-w-6xl px-6 py-14 md:px-12">
          <h2>Запишитесь в открытый слот</h2>
          <p className="lede mt-4">
            Календарь показывает только свободное время. Заявка сразу в листе мастера.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="btn-light">
              Открыть календарь
            </Link>
            <a href={SHOP.telegram} className="btn-outline" target="_blank" rel="noreferrer">
              Записаться в Telegram
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
