"use client";

import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "@/lib/api-client";

export function LoginForm({ next }: { next?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ next: string }>("/api/auth/login", {
        body: { identifier, password, remember, next },
      });
      window.location.assign(data.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="identifier">Kullanıcı adı veya e-posta</label>
        <input
          id="identifier"
          className="input"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Şifre</label>
        <div className="input-wrap">
          <input
            id="password"
            className="input"
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="reveal"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Şifreyi gizle" : "Şifreyi göster"}
            aria-pressed={reveal}
          >
            {reveal ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Beni hatırla <span className="muted">(90 gün)</span>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
        <LogIn size={18} />
        {busy ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
