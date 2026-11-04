"use client";

import { useState } from "react";
import Link from "next/link";
import { gateScene, portraitScene } from "@/lib/scenes/gate";
import { setProfile } from "@/lib/profile";
import { api } from "@/lib/api-client";
import { logout } from "@/components/logout-button";
import type { Person } from "@/lib/scenes/types";
import { PixelCanvas } from "./pixel-canvas";
import s from "./auth.module.css";

// Giriş: şato kapısında parşömen form. Rutin panelinin mevcut giriş API'sine bağlı (ortak hesap).
export function LoginScreen({ next }: { next?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ next: string }>("/api/auth/login", { body: { identifier, password, remember, next } });
      window.location.assign(data.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <PixelCanvas fill fps={24} className={s.bg} draw={(c, w, h, t, still) => gateScene(c, w, h, t, still)} />
      <form className={s.card} onSubmit={onSubmit} noValidate>
        <h1><img className={s.logo} src="/logo.png" alt="İkimizin Rutini" width={1200} height={305} /></h1>
        <p className={s.sub}>Şatonun kapısı yalnızca ikimize açılır.</p>
        <label className={s.field}>
          <span>Kullanıcı adı veya e-posta</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
        </label>
        <label className={s.field}>
          <span>Şifre</span>
          <div className={s.pass}>
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} name="password" autoComplete="current-password" required />
            <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? "Gizle" : "Göster"}</button>
          </div>
        </label>
        <label className={s.check}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Beni hatırla
        </label>
        {error && <p className={s.error} role="alert">{error}</p>}
        <button className={s.primary} type="submit" disabled={busy || !identifier || !password}>{busy ? "Kapı açılıyor…" : "Kapıyı aç"}</button>
        <p className={s.foot}>Yalnızca Cengiz ve Ayşenur&apos;a özel.</p>
      </form>
      <Link href="/" className={s.back}>← Hikâyeye dön</Link>
    </div>
  );
}

export type ProfileOption = { id: string; name: string; locked: boolean };

// isimden piksel karaktere: "Ayşenur" ya da "Aysenur" içeren profil Ayşenur, diğeri Cengiz
const figure = (name: string): Person => (/ay[sş]enur/i.test(name) ? "aysenur" : "cengiz");

// "Kim kullanıyor?": rutin panelinin profil API'sine bağlı; şifreli profil şifreyle açılır.
export function ProfilePicker({ profiles, currentId, next }: { profiles: ProfileOption[]; currentId: string | null; next: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<ProfileOption | null>(null);
  const [password, setPassword] = useState("");

  async function choose(p: ProfileOption, pass?: string) {
    if (p.locked && p.id !== currentId && pass === undefined) { setUnlocking(p); setPassword(""); setError(null); return; }
    setBusy(p.id);
    setError(null);
    try {
      await api("/api/auth/profile", { body: { userId: p.id, password: pass } });
      setProfile(figure(p.name)); // hikâye sayfasındaki rozet için
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seçilemedi.");
      setBusy(null);
    }
  }

  return (
    <div className={s.page}>
      <PixelCanvas fill fps={15} className={s.bg} draw={(c, w, h, t, still) => gateScene(c, w, h, t, still, false)} />
      <div className={s.pick}>
        <h1>Kim giriyor?</h1>
        <div className={s.cards}>
          {profiles.map((p) => {
            const who = figure(p.name);
            return (
              <button key={p.id} className={`${s.profile} ${p.id === currentId ? s.active : ""}`} onClick={() => choose(p)} disabled={busy !== null} aria-current={p.id === currentId ? "true" : undefined}>
                <PixelCanvas size={[64, 56]} scale={3} fps={10} className={s.portrait} label={p.name} draw={(c, w, h, t, still) => portraitScene(c, who, w, h, t, still)} />
                <b>{p.name}</b>
                {p.id === currentId ? <i>şu an bu profil</i> : p.locked ? <span>🔒 şifreli</span> : <span>{who === "cengiz" ? "Kickboks · Düldül" : "Pilates · papağan"}</span>}
              </button>
            );
          })}
        </div>
        {unlocking && (
          <form className={s.card} onSubmit={(e) => { e.preventDefault(); void choose(unlocking, password); }}>
            <label className={s.field}>
              <span>{unlocking.name} profilinin şifresi</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
            </label>
            <button className={s.primary} type="submit" disabled={busy !== null || !password}>Aç</button>
            <button type="button" className={s.linkDark} onClick={() => setUnlocking(null)}>Vazgeç</button>
          </form>
        )}
        {error && <p className={s.errorLight} role="alert">{error}</p>}
        <nav className={s.pickNav} aria-label="Diğer seçenekler">
          {currentId && <a className={s.link} href={next}>← {profiles.find((p) => p.id === currentId)?.name.split(" ")[0]} olarak devam et</a>}
          <Link className={s.link} href="/">Hikâyeye dön</Link>
          <button className={s.link} onClick={() => void logout()}>Çıkış yap</button>
        </nav>
      </div>
    </div>
  );
}
