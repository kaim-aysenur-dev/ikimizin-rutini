"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Pencil, Play, RotateCcw, Trash, Video as VideoIcon } from "lucide-react";
import { Toast } from "@/components/toast";
import { api } from "@/lib/api-client";
import { gainXp } from "@/components/xp-badge";
import { XP } from "@/lib/xp";
import { diffDays, formatDayShort } from "@/lib/dates";
import {
  INTENSITIES,
  INTENSITY_LABEL,
  youtubeThumbUrl,
  youtubeWatchUrl,
  type ActivityType,
  type Intensity,
  type Video,
} from "@/lib/sport-shared";

type Props = { today: string; videos: Video[]; types: ActivityType[] };

const LENGTHS = [
  { id: "kisa", label: "≤ 20 dk", test: (m: number) => m <= 20 },
  { id: "orta", label: "20–40 dk", test: (m: number) => m > 20 && m <= 40 },
  { id: "uzun", label: "40 dk +", test: (m: number) => m > 40 },
] as const;

// YouTube'a gidip dönünce "Bitirdin mi?" sorusu için açılan video bu cihazda hatırlanır (6 saat)
const OPENED_KEY = "spor-acilan-video";
const OPENED_TTL = 6 * 60 * 60 * 1000;

function readOpened(): string | null {
  try {
    const raw = localStorage.getItem(OPENED_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { id?: string; at?: number };
    return v.id && v.at && Date.now() - v.at < OPENED_TTL ? v.id : null;
  } catch {
    return null;
  }
}

function writeOpened(id: string | null) {
  try {
    if (id) localStorage.setItem(OPENED_KEY, JSON.stringify({ id, at: Date.now() }));
    else localStorage.removeItem(OPENED_KEY);
  } catch {
    // depolama kapalıysa soru yalnızca bu sayfada kalır
  }
}

function lastLabel(day: string, today: string): string {
  const d = diffDays(today, day);
  return d === 0 ? "bugün" : d === 1 ? "dün" : formatDayShort(day);
}

/** Spor · Videolar: YouTube linkleriyle kişisel video listesi */
export function VideoLibrary({ today, videos, types }: Props) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [lengthFilter, setLengthFilter] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clear = useCallback(() => setMessage(null), []);
  const typeOf = (id: string | null) => types.find((t) => t.id === id);

  useEffect(() => {
    // tarayıcı depolaması yalnızca istemcide okunabilir
    setOpened(readOpened());
  }, []);

  const length = LENGTHS.find((l) => l.id === lengthFilter);
  const shown = videos.filter(
    (v) => (!typeFilter || v.typeId === typeFilter) && (!length || (v.minutes !== null && length.test(v.minutes))),
  );

  function open(id: string) {
    writeOpened(id);
    setOpened(id);
  }

  async function done(v: Video) {
    try {
      await api("/api/sport/sessions", {
        body: { day: today, videoId: v.id, typeId: v.typeId, minutes: v.minutes, intensity: v.level },
      });
      gainXp(XP.sport);
      writeOpened(null);
      setOpened(null);
      setMessage("Kaydedildi, haftalık hedefe eklendi.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Kaydedilemedi.");
    }
  }

  return (
    <div className="stack section-stack">
      <AddVideo types={types} onAdded={() => router.refresh()} />

      {videos.length > 0 ? (
        <>
          <div className="stack" style={{ gap: 8 }}>
            <div className="chips" role="group" aria-label="Türe göre">
              <button type="button" className="chip" aria-pressed={!typeFilter} onClick={() => setTypeFilter(null)}>
                Tümü <span className="count">{videos.length}</span>
              </button>
              {types
                .filter((t) => videos.some((v) => v.typeId === t.id))
                .map((t) => (
                  <button key={t.id} type="button" className="chip" aria-pressed={typeFilter === t.id} onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}>
                    {t.name} <span className="count">{videos.filter((v) => v.typeId === t.id).length}</span>
                  </button>
                ))}
            </div>
            <div className="chips" role="group" aria-label="Süreye göre">
              {LENGTHS.map((l) => (
                <button key={l.id} type="button" className="chip" aria-pressed={lengthFilter === l.id} onClick={() => setLengthFilter(lengthFilter === l.id ? null : l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {shown.length ? (
            <ul className="video-grid">
              {shown.map((v) => {
                const t = typeOf(v.typeId);
                if (editing === v.id) {
                  return (
                    <li key={v.id}>
                      <VideoForm types={types} video={v} onDone={() => setEditing(null)} />
                    </li>
                  );
                }
                return (
                  <li key={v.id} className="video-card" data-color={t?.color}>
                    <a href={youtubeWatchUrl(v.youtubeId)} target="_blank" rel="noopener noreferrer" className="video-thumb" onClick={() => open(v.id)} aria-label={`${v.title} videosunu YouTube'da aç`}>
                      <img src={youtubeThumbUrl(v.youtubeId)} alt="" loading="lazy" />
                      {t && <span className="video-tag">{t.name}</span>}
                      <span className="video-play" aria-hidden="true">
                        <Play size={18} fill="currentColor" />
                      </span>
                      {v.minutes && <span className="video-dur num">{v.minutes} dk</span>}
                    </a>
                    <div className="video-body">
                      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                        <h3 className="grow video-title">{v.title}</h3>
                        <button type="button" className="icon-btn" onClick={() => setEditing(v.id)} aria-label={`${v.title} düzenle`}>
                          <Pencil size={15} />
                        </button>
                      </div>
                      <p className="video-meta">
                        {[
                          v.channel || null,
                          v.level ? INTENSITY_LABEL[v.level] : null,
                          v.times ? `${v.times} kez yapıldı · son ${lastLabel(v.lastDay!, today)}` : "Henüz yapılmadı",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {opened === v.id ? (
                        <div className="video-return">
                          <RotateCcw size={16} aria-hidden="true" />
                          <span className="grow">Bitirdin mi?</span>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => done(v)}>
                            <Check size={15} strokeWidth={3} /> Yaptım{v.minutes ? ` · ${v.minutes} dk` : ""}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              writeOpened(null);
                              setOpened(null);
                            }}
                          >
                            Hayır
                          </button>
                        </div>
                      ) : (
                        <div className="row video-actions">
                          <a href={youtubeWatchUrl(v.youtubeId)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm grow" onClick={() => open(v.id)}>
                            <ExternalLink size={15} aria-hidden="true" /> YouTube&apos;da aç
                          </a>
                          <button type="button" className="btn btn-primary btn-sm grow" onClick={() => done(v)}>
                            <Check size={15} strokeWidth={3} aria-hidden="true" /> Yaptım
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Bu filtreye uyan video yok.</p>
          )}
        </>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <VideoIcon size={26} />
          </span>
          <h2>Video listen boş</h2>
          <p>Pilates ya da dans videosunun linkini YouTube&apos;dan kopyalayıp yukarıya yapıştır. Başlık ve kanal otomatik gelir.</p>
        </div>
      )}
      <Toast message={message} onDone={clear} />
    </div>
  );
}

/** Link yapıştır → YouTube'dan başlık/kanal → tür, süre, zorluk → kaydet */
function AddVideo({ types, onAdded }: { types: ActivityType[]; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [found, setFound] = useState<{ youtubeId: string; title: string; channel: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setFound(await api<{ youtubeId: string; title: string; channel: string }>("/api/sport/videos/lookup", { body: { url } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video bulunamadı.");
    }
    setBusy(false);
  }

  if (found) {
    return (
      <VideoForm
        types={types}
        found={found}
        onDone={(added) => {
          setFound(null);
          if (added) {
            setUrl("");
            onAdded();
          }
        }}
      />
    );
  }

  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={lookup}>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <label htmlFor="video-url" className="sr-only">
          YouTube linki
        </label>
        <input
          id="video-url"
          className="input grow"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube linkini yapıştır…"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !url.trim()}>
          {busy ? "Bakılıyor…" : "Ekle"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

function VideoForm({
  types,
  video,
  found,
  onDone,
}: {
  types: ActivityType[];
  video?: Video;
  found?: { youtubeId: string; title: string; channel: string };
  onDone: (changed: boolean) => void;
}) {
  const router = useRouter();
  const youtubeId = video?.youtubeId ?? found!.youtubeId;
  const [title, setTitle] = useState(video?.title ?? found?.title ?? "");
  const [channel, setChannel] = useState(video?.channel ?? found?.channel ?? "");
  const [typeId, setTypeId] = useState(video?.typeId ?? types[0]?.id ?? "");
  const [minutes, setMinutes] = useState(video?.minutes?.toString() ?? "");
  const [level, setLevel] = useState<Intensity | null>(video?.level ?? null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = video?.id ?? "yeni";

  async function run(action: "save" | "delete") {
    setBusy(true);
    setError(null);
    const body = { youtubeId, title, channel, typeId: typeId || null, minutes, level };
    try {
      if (action === "delete") await api(`/api/sport/videos/${video!.id}`, { method: "DELETE" });
      else if (video) await api(`/api/sport/videos/${video.id}`, { method: "PATCH", body });
      else await api("/api/sport/videos", { body });
      router.refresh();
      onDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form
      className="card stack video-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run("save");
      }}
    >
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <img className="video-form-thumb" src={youtubeThumbUrl(youtubeId)} alt="" />
        <p className="muted small grow">{video ? "Videoyu düzenle" : "YouTube'dan gelen bilgileri kontrol et, türünü ve süresini seç."}</p>
      </div>
      <div className="form-grid two">
        <div className="field span-2">
          <label htmlFor={`v-title-${key}`}>Başlık</label>
          <input id={`v-title-${key}`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor={`v-channel-${key}`}>Kanal</label>
          <input id={`v-channel-${key}`} className="input" value={channel} onChange={(e) => setChannel(e.target.value)} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor={`v-type-${key}`}>Tür</label>
          <select id={`v-type-${key}`} className="input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Türsüz</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`v-min-${key}`}>Süre (dk)</label>
          <input id={`v-min-${key}`} className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Ör. 20" />
        </div>
        <fieldset className="field">
          <legend className="field-label">Zorluk</legend>
          <div className="seg" role="radiogroup" aria-label="Zorluk">
            {INTENSITIES.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={level === i} onClick={() => setLevel(level === i ? null : i)}>
                {INTENSITY_LABEL[i]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
          {video ? "Kaydet" : "Listeye ekle"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onDone(false)} disabled={busy}>
          Vazgeç
        </button>
        {video &&
          (confirm ? (
            <button type="button" className="btn btn-danger" onClick={() => run("delete")} disabled={busy}>
              Evet, kaldır
            </button>
          ) : (
            <button type="button" className="icon-btn" onClick={() => setConfirm(true)} aria-label="Videoyu listeden kaldır">
              <Trash size={16} />
            </button>
          ))}
      </div>
      {confirm && <p className="hint">Video listeden kalkar; bu videoyla yaptığın oturumlar silinmez.</p>}
    </form>
  );
}
