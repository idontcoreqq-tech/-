"use client";

import { useEffect, useState } from "react";

const KEY = "kromka-theme";

function rememberTheme(theme) {
  window.localStorage.setItem(KEY, theme);
  document.cookie = `${KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      rememberTheme(stored);
      document.documentElement.classList.toggle("dark", stored !== "light");
      return;
    }
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    rememberTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-wine hover:text-wine"
      aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
    >
      {theme === "dark" ? "Светлая" : "Тёмная"}
    </button>
  );
}
