"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api } from "@/lib/api-client";
import { uploadImage } from "@/lib/upload-client";

export function ProfileForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(name);
  const [photo, setPhoto] = useState(avatarUrl);
  const [busy, setBusy] = useState<"name" | "photo" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("name");
    setMessage(null);
    try {
      await api("/api/profile", { method: "PATCH", body: { displayName } });
      setMessage({ ok: true, text: "Adın güncellendi." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaydedilemedi." });
    }
    setBusy(null);
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setBusy("photo");
    setMessage(null);
    try {
      const publicId = await uploadImage(file, "avatar", 800);
      const res = await api<{ avatarUrl: string | null }>("/api/profile", {
        method: "PATCH",
        body: { avatarPublicId: publicId },
      });
      setPhoto(res.avatarUrl);
      setMessage({ ok: true, text: "Profil fotoğrafın güncellendi." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Fotoğraf yüklenemedi." });
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(null);
  }

  async function removePhoto() {
    setBusy("photo");
    setMessage(null);
    try {
      await api("/api/profile", { method: "PATCH", body: { avatarPublicId: null } });
      setPhoto(null);
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Kaldırılamadı." });
    }
    setBusy(null);
  }

  return (
    <div className="stack">
      <div className="row">
        <Avatar name={displayName || name} url={photo} size={72} />
        <div className="row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
          >
            <Camera size={18} /> {busy === "photo" ? "Yükleniyor…" : photo ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
          </button>
          {photo && (
            <button type="button" className="icon-btn" onClick={removePhoto} disabled={busy !== null} aria-label="Fotoğrafı kaldır">
              <Trash size={18} />
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void changePhoto(e.target.files?.[0])}
        />
      </div>
      <form className="stack" onSubmit={saveName}>
        <div className="field">
          <label htmlFor="display-name">Ad soyad</label>
          <input
            id="display-name"
            className="input"
            autoComplete="name"
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <button className="btn btn-primary" type="submit" disabled={busy !== null || displayName.trim() === name}>
            {busy === "name" ? "Kaydediliyor…" : "Adı kaydet"}
          </button>
        </div>
      </form>
      {message && (
        <p className={message.ok ? "form-ok" : "form-error"} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
