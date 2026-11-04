"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "./SiteHeader";
import { requestJson } from "@/lib/apiClient";

export function AdminGate({ children, mainClassName }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((session) => {
        setAuthed(Boolean(session.ok));
        setReady(true);
      });
  }, []);

  async function login(event) {
    event.preventDefault();
    try {
      await requestJson("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setError("");
      setAuthed(true);
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader variant="admin" />
      <main className={mainClassName}>
        {authed ? (
          children
        ) : (
          <form className="sheet mx-auto max-w-md p-8" onSubmit={login}>
            <h1 className="font-display text-4xl">Вход</h1>
            <label className="mt-8 grid gap-2">
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field"
              />
            </label>
            {error ? <p className="mt-3 text-wine">{error}</p> : null}
            <button type="submit" className="btn-gold mt-6">
              Войти
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
