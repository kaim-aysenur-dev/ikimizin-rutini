"use client";

import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { STATIONS, STATION_ORDER, type Station, playStation, setMusicVolume, stopMusic } from "@/lib/music";

// Panelin üst çubuğunda müzik: üç hazır istasyon (anında üretilir, telifsiz) ve YouTube'dan kendi şarkıların.
// Panel sayfaları arasında gezerken çalmaya devam eder. Tercihler bu cihazda saklanır.

type Song = { id: string; title: string };
type Saved = { station: Station; volume: number; songs: Song[] };
const KEY = "muzik";
const IDEAS = ["Dalida Portofino", "Sade Smooth Operator", "Italian jazz cafe", "lofi hip hop study", "medieval tavern music"];

/** youtube.com/watch?v=, youtu.be/, /embed/, /shorts/, music.youtube.com bağlantılarından video kimliği */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null;
}
function load(): Saved {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (v && v.station in STATIONS) return { station: v.station, volume: Number(v.volume) || 0.5, songs: Array.isArray(v.songs) ? v.songs.slice(0, 40) : [] }; } catch { /* özel pencere */ }
  return { station: "lofi", volume: 0.5, songs: [] };
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Saved>({ station: "lofi", volume: 0.5, songs: [] });
  const [playing, setPlaying] = useState<Station | null>(null);
  const [song, setSong] = useState<Song | null>(null); // çalan YouTube şarkısı (küçük oynatıcıda)
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSaved(load()); }, []);
  useEffect(() => () => stopMusic(false), []);
  const save = (next: Saved) => { setSaved(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* özel pencere */ } };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const play = async (st: Station) => {
    setSong(null);
    await playStation(st, saved.volume);
    setPlaying(st); save({ ...saved, station: st });
  };
  const stop = () => { stopMusic(); setPlaying(null); setSong(null); };
  const playSong = (s: Song) => { stopMusic(); setPlaying(null); setSong(s); };

  const addSong = (e: React.FormEvent) => {
    e.preventDefault();
    const id = youtubeId(url);
    if (!id) { setErr("Bu bir YouTube bağlantısı gibi görünmüyor."); return; }
    const s = { id, title: title.trim().slice(0, 60) || "Şarkı" };
    save({ ...saved, songs: [s, ...saved.songs.filter((x) => x.id !== id)].slice(0, 40) });
    setUrl(""); setTitle(""); setErr(null); playSong(s);
  };

  const active = playing || song;
  return (
    <div className="music" ref={ref}>
      <button type="button" className={`music-btn${active ? " is-on" : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        aria-label={active ? `Müzik: ${song ? song.title : STATIONS[playing!].label} çalıyor` : "Müzik"}>
        {active ? <span className="music-eq" aria-hidden="true"><i /><i /><i /></span> : <Music size={18} aria-hidden="true" />}
        <span className="music-label">{song ? song.title : playing ? STATIONS[playing].label : "Müzik"}</span>
      </button>

      {open && (
        <div className="menu music-pop" role="dialog" aria-label="Müzik">
          <p className="music-head">Arka plan müziği</p>
          <div className="music-stations">
            {STATION_ORDER.map((st) => (
              <button key={st} type="button" className={`music-station${playing === st ? " is-on" : ""}`} aria-pressed={playing === st} onClick={() => void play(st)}>
                <span aria-hidden="true">{STATIONS[st].emoji}</span>
                <span><b>{STATIONS[st].label}</b><small>{STATIONS[st].hint}</small></span>
              </button>
            ))}
          </div>
          <div className="music-row">
            {playing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void play(playing)} title="Aynı istasyonda yeni bir parça">⏭ Başka çal</button>}
            {active && <button type="button" className="btn btn-ghost btn-sm" onClick={stop}>⏸ Durdur</button>}
            <label className="music-vol">
              <span aria-hidden="true">🔊</span>
              <input type="range" min={0} max={1} step={0.05} value={saved.volume} aria-label="Ses seviyesi"
                onChange={(e) => { const v = Number(e.target.value); setMusicVolume(v); save({ ...saved, volume: v }); }} />
            </label>
          </div>
          <p className="music-note">Hazır istasyonlar her çalışta yeniden üretilir; telifsizdir. YouTube şarkılarının sesini oynatıcıdan ayarla.</p>

          <p className="music-head">Kendi şarkıların (YouTube)</p>
          <form className="music-add" onSubmit={addSong}>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube bağlantısı yapıştır" aria-label="YouTube bağlantısı" />
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ad (ör. Portofino)" maxLength={60} aria-label="Şarkının adı" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!url.trim()}>Ekle ve çal</button>
          </form>
          {err && <p className="form-error">{err}</p>}
          <p className="music-note">
            Ara, bağlantıyı kopyala:{" "}
            {IDEAS.map((q) => <a key={q} className="music-idea" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer">{q}</a>)}
          </p>
          {saved.songs.length > 0 && (
            <ul className="music-songs">
              {saved.songs.map((s) => (
                <li key={s.id} className={song?.id === s.id ? "is-on" : undefined}>
                  <button type="button" className="music-song" onClick={() => playSong(s)}>{song?.id === s.id ? "♪" : "▶"} {s.title}</button>
                  <button type="button" className="btn btn-quiet btn-sm" aria-label={`${s.title}: listeden çıkar`}
                    onClick={() => { if (song?.id === s.id) setSong(null); save({ ...saved, songs: saved.songs.filter((x) => x.id !== s.id) }); }}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* YouTube kuralları gereği oynatıcı görünür kalır: köşede küçük pencere */}
      {song && (
        <div className="music-dock" role="region" aria-label={`Çalan: ${song.title}`}>
          <div className="music-dock-bar">
            <b>♪ {song.title}</b>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSong(null)} aria-label="Şarkıyı kapat">✕</button>
          </div>
          <iframe
            key={song.id}
            src={`https://www.youtube-nocookie.com/embed/${song.id}?autoplay=1&loop=1&playlist=${song.id}&rel=0&playsinline=1`}
            title={song.title}
            width={240}
            height={135}
            allow="autoplay; encrypted-media; picture-in-picture"
            // site geneli "same-origin" yönlendiren bilgisini göndermez; YouTube oynatıcısı bunu ister (yoksa hata 153)
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
    </div>
  );
}
