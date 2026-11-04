import Link from "next/link";
import { SHOP } from "@/lib/shop";

const tel = SHOP.phone.replace(/\D/g, "");

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper px-5 py-14 md:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-extrabold">
            Кромка
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Барбершоп на Вайнера. Свободный слот на сайте или в Telegram.
          </p>
        </div>
        <div>
          <p className="font-display text-sm font-bold">Страницы</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/#story">О нас</Link>
            </li>
            <li>
              <Link href="/#services">Услуги</Link>
            </li>
            <li>
              <Link href="/#barbers">Мастера</Link>
            </li>
            <li>
              <Link href="/book">Запись</Link>
            </li>
            <li>
              <Link href="/admin">Вход для мастера</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm font-bold">Услуги</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Стрижка</li>
            <li>Машинкой</li>
            <li>Борода</li>
            <li>Стрижка и борода</li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm font-bold">Контакты</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              {SHOP.city}, {SHOP.address}
            </li>
            <li>
              <a href={`tel:${tel}`}>{SHOP.phone}</a>
            </li>
            <li>
              <a href={SHOP.telegram} target="_blank" rel="noreferrer">
                Запись в Telegram
              </a>
            </li>
            <li>Пн–вс, по сменам мастеров</li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-line pt-6 text-sm text-muted">
        {new Date().getFullYear()} Кромка
      </p>
    </footer>
  );
}
