"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export function PasswordForm({ username, firstLogin = false }: { username: string; firstLogin?: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (next !== repeat) {
      setError("Yeni şifreler birbirini tutmuyor.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", { body: { current, next } });
      if (firstLogin) {
        window.location.assign("/bugun");
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre değiştirilemedi.");
    }
    setBusy(false);
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      {/* Parola yöneticileri hangi hesap olduğunu anlasın */}
      <input type="text" name="username" autoComplete="username" value={username} hidden readOnly />
      <div className="field">
        <label htmlFor="pw-current">{firstLogin ? "Geçici şifre" : "Mevcut şifre"}</label>
        <input
          id="pw-current"
          className="input"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="pw-next">Yeni şifre</label>
        <input
          id="pw-next"
          className="input"
          type="password"
          autoComplete="new-password"
          aria-describedby="pw-rule"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <span id="pw-rule" className="hint">
          En az 8 karakter; en az bir harf ve bir rakam.
        </span>
      </div>
      <div className="field">
        <label htmlFor="pw-repeat">Yeni şifre (tekrar)</label>
        <input
          id="pw-repeat"
          className="input"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="form-ok" role="status">
          Şifren değişti. Diğer cihazlardaki oturumlar kapatıldı.
        </p>
      )}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? "Kaydediliyor…" : firstLogin ? "Şifremi belirle ve devam et" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
