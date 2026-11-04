"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ variant = "site", tone = "theme" }) {
  const isAdmin = variant === "admin";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const links = isAdmin
    ? [
        { href: "/admin", label: "Нагрузка" },
        { href: "/admin/barbers", label: "Барберы" },
        { href: "/", label: "Сайт" },
      ]
    : [
        { href: "/#story", label: "О нас" },
        { href: "/#services", label: "Услуги" },
        { href: "/#barbers", label: "Мастера" },
        { href: "/#price", label: "Прайс" },
        { href: "/book", label: "Запись" },
      ];

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-header${tone === "on-video" ? " on-video" : ""}${scrolled || open ? " is-scrolled" : ""}`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2563eb] text-lg text-white">
            К
          </span>
          Кромка
        </Link>
        <nav className="site-nav text-[0.95rem] text-muted">
          {links.map((link) => {
            const active = link.href === pathname;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "font-semibold text-wine" : "hover:text-ink"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="site-actions">
          <ThemeToggle />
          <Link href="/book" className="btn-gold site-book">
            Записаться
          </Link>
          <button
            type="button"
            className="site-menu-btn"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {open ? (
        <nav id="site-menu" className="site-mobile mx-auto max-w-6xl">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/book" className="btn-gold self-start" onClick={() => setOpen(false)}>
            Записаться
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
