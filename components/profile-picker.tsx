"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api } from "@/lib/api-client";

type Option = { id: string; name: string; avatarUrl: string | null; locked: boolean };

export function ProfilePicker({ profiles, currentId, next }: { profiles: Option[]; currentId: string | null; next: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Şifre sorulan (kilitli) profil
  const [unlocking, setUnlocking] = useState<Option | null>(null);
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);

  async function choose(p: Option, pass?: string) {
    if (p.locked && p.id !== currentId && pass === undefined) {
      setUnlocking(p);
      setPassword("");
      setError(null);
      return;
    }
    setBusy(p.id);
    setError(null);
    try {
      await api("/api/auth/profile", { body: { userId: p.id, password: pass } });
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seçilemedi.");
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="profile-options">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className="profile-option"
            aria-current={p.id === currentId ? "true" : undefined}
            aria-pressed={unlocking?.id === p.id ? true : undefined}
            onClick={() => choose(p)}
            disabled={busy !== null}
          >
            <Avatar name={p.name} url={p.avatarUrl} size={72} />
            <span className="profile-name">{p.name}</span>
            {p.id === currentId ? (
              <span className="profile-current">
                <Check size={14} /> Şu an seçili
              </span>
            ) : (
              p.locked && (
                <span className="profile-current is-locked">
                  <Lock size={13} /> Şifreli
                </span>
              )
            )}
            {busy === p.id && <span className="muted small">Açılıyor…</span>}
          </button>
        ))}
      </div>
      {unlocking && (
        <form
          className="stack"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (password) choose(unlocking, password);
          }}
        >
          <div className="field">
            <label htmlFor="profile-password">{unlocking.name} profilinin şifresi</label>
            <div className="input-wrap">
              <input
                id="profile-password"
                className="input"
                type={reveal ? "text" : "password"}
                autoComplete="off"
                autoFocus
                enterKeyHint="go"
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
          <button className="btn btn-primary btn-block" type="submit" disabled={busy !== null || !password}>
            <Lock size={16} />
            {busy ? "Açılıyor…" : "Profili aç"}
          </button>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
