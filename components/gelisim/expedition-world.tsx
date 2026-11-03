"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { GEAR } from "@/lib/gear";
import { armorStats, spellStats, weaponStats } from "@/lib/combat-stats";
import { DIFFICULTIES, REGIONS, expectedLevel, regionOf, type Region } from "@/lib/expedition-content";
import { canEnter, emptyCampaign, idleInput, loadoutSummary, startRun, type Campaign, type HeroInfo, type Input, type Run } from "@/lib/expedition";
import { drawExpedition, drawMinimap } from "@/lib/expedition-draw";
import styles from "./expedition-world.module.css";

type Reply = { campaign: Campaign; serverTime: number };
type ActionLatch = { attack: boolean; dodge: boolean; spell: number | null; interact: boolean };
const emptyLatch = (): ActionLatch => ({ attack: false, dodge: false, spell: null, interact: false });
const nameOf = (id: string | null) => GEAR.find((g) => g.id === id)?.name ?? "Yumruk";
const MOVE: Record<string, [number, number]> = { w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1] };

function RegionPreview({ region }: { region: Region }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current?.getContext("2d"); if (!c) return;
    const campaign = emptyCampaign(); campaign.completed = REGIONS.map((r) => r.id);
    const point = region.objectives[1];
    startRun(campaign, region.id, 0, { id: "preview", name: "Cengiz", level: 100, equipment: { armor: "deri-zirh", weapon: "demir-kilic", spells: [] } }, "preview", 99, 100);
    const run = campaign.run!; run.players.preview.i = point.i - 2; run.players.preview.j = point.j + 3;
    drawExpedition(c, run, "preview", 100, { ox: 170 - (point.i - point.j) * 8, oy: 80 - (point.i + point.j) * 4 });
  }, [region]);
  return <canvas ref={cv} width={340} height={155} className={styles.preview} role="img" aria-label={`${region.name} manzarası`} />;
}

function Battlefield({ run, heroId, pressed, latch }: { run: Run; heroId: string; pressed: React.RefObject<Set<string>>; latch: React.RefObject<ActionLatch> }) {
  const cv = useRef<HTMLCanvasElement>(null), mini = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null);
  const current = useRef({ run, previous: run, received: performance.now() });
  if (current.current.run !== run) current.current = { run, previous: current.current.run, received: performance.now() };
  const camera = useRef({ ox: 0, oy: 0, ready: false });
  useEffect(() => {
    const el = stage.current!, canvas = cv.current!, c = canvas.getContext("2d")!, mc = mini.current!.getContext("2d")!;
    const resize = () => { const r = el.getBoundingClientRect(); const k = r.width > 700 ? 2 : 1.5; canvas.width = Math.ceil(r.width / k); canvas.height = Math.ceil(r.height / k); c.imageSmoothingEnabled = false; camera.current.ready = false; };
    resize(); const observer = new ResizeObserver(resize); observer.observe(el);
    let frame = 0;
    const animate = () => {
      const { run: r, previous, received } = current.current;
      const blend = Math.min(1, (performance.now() - received) / 180);
      const position = <T extends { i: number; j: number }>(next: T, before?: T): T => before ? { ...next, i: before.i + (next.i - before.i) * blend, j: before.j + (next.j - before.j) * blend } : next;
      const view = { ...r, players: Object.fromEntries(Object.entries(r.players).map(([id, p]) => [id, position(p, previous.players[id])])), enemies: r.enemies.map((e) => position(e, previous.enemies.find((p) => p.id === e.id))) };
      const focus = view.players[heroId] ?? Object.values(view.players)[0];
      if (focus) {
        const now = r.time + Math.min(0.3, (performance.now() - received) / 1000), cam = camera.current;
        const tx = canvas.width / 2 - (focus.i - focus.j) * 8, ty = canvas.height * 0.53 - (focus.i + focus.j) * 4;
        if (!cam.ready) { cam.ox = tx; cam.oy = ty; cam.ready = true; } else { cam.ox += (tx - cam.ox) * 0.15; cam.oy += (ty - cam.oy) * 0.15; }
        drawExpedition(c, view, heroId, now, { ox: Math.round(cam.ox), oy: Math.round(cam.oy) });
        drawMinimap(mc, r, heroId);
      }
      frame = requestAnimationFrame(animate);
    };
    animate(); return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [heroId]);
  const hold = (key: string, label: string, glyph: string) => <button type="button" aria-label={label} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pressed.current.add(key); if (key === "j") latch.current.attack = true; if (key === "f") latch.current.interact = true; }} onPointerUp={() => pressed.current.delete(key)} onPointerCancel={() => pressed.current.delete(key)}>{glyph}</button>;
  const fullscreen = async () => {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    try { await stage.current?.requestFullscreen(); } catch { stage.current?.classList.toggle(styles.expanded); }
  };
  return <div className={styles.stage} ref={stage}>
    <canvas ref={cv} className={styles.canvas} role="img" aria-label={`${regionOf(run.region)!.name}; WASD ile yürü, J saldır, 1–4 büyü, boşluk kaçın, F etkileşim`} onPointerDown={(e) => { if (e.button === 0) latch.current.attack = true; }} />
    <canvas ref={mini} width={136} height={100} className={styles.minimap} role="img" aria-label="Bölüm haritası: sarı noktalar görevler, kırmızı nokta boss" />
    <button className={styles.fullscreen} type="button" onClick={() => void fullscreen()} aria-label="Savaş alanını tam ekran yap">⛶</button>
    <div className={styles.pad} aria-label="Yön kontrolleri">{hold("w", "Yukarı yürü", "↑")}{hold("a", "Sola yürü", "←")}{hold("s", "Aşağı yürü", "↓")}{hold("d", "Sağa yürü", "→")}</div>
    <div className={styles.actions}>{hold("f", "Etkileşim; yardım etmek için basılı tut", "✋")}<button type="button" aria-label="Kaçın" onPointerDown={(e) => { e.preventDefault(); latch.current.dodge = true; }}>↝</button>{hold("j", "Silahla saldır", "⚔")}</div>
  </div>;
}

export function ExpeditionWorld({ hero }: { hero: HeroInfo }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null), [joined, setJoined] = useState(false), [difficulty, setDifficulty] = useState(0);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [connected, setConnected] = useState(true);
  const pressed = useRef(new Set<string>()), latch = useRef(emptyLatch()), seq = useRef(Date.now());
  const inFlight = useRef(false), alive = useRef(true);
  const run = campaign?.run, player = run?.players[hero.id], region = run ? regionOf(run.region)! : null;
  const info = loadoutSummary(player?.level ?? hero.level, player?.equipment ?? hero.equipment);
  const [guideOpen, setGuideOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [sound, setSound] = useState(false), audio = useRef<AudioContext | null>(null), hornSeen = useRef(0);
  useEffect(() => { hornSeen.current = 0; }, [run?.id]);
  useEffect(() => {
    if (!sound || !audio.current || !run) return;
    const warning = run.notices.find((n) => n.id > hornSeen.current && n.text.startsWith("Uzakta"));
    if (!warning) return;
    hornSeen.current = warning.id;
    const ctx = audio.current;
    for (let k = 0; k < 3; k++) {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + k * 0.55;
      osc.type = "triangle"; osc.frequency.setValueAtTime(k === 2 ? 130.8 : 98, start);
      gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.12, start + 0.08); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain).connect(ctx.destination); osc.start(start); osc.stop(start + 0.5);
    }
  }, [sound, run]);
  useEffect(() => () => { void audio.current?.close(); }, []);
  const toggleSound = async () => {
    if (sound) { setSound(false); return; }
    try { audio.current ??= new AudioContext(); await audio.current.resume(); setSound(true); } catch { setSound(false); }
  };
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (joined) return;
    const controller = new AbortController();
    let pending = false;
    const refresh = async (first = false) => {
      if (pending || (!first && document.hidden)) return;
      pending = true;
      try { const r = await api<Reply>("/api/gelisim/sefer", { signal: controller.signal }); if (!controller.signal.aborted) { setCampaign(r.campaign); setError(""); } }
      catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Yol haritası yüklenemedi."); }
      finally { pending = false; }
    };
    void refresh(true); const interval = window.setInterval(() => void refresh(), 2000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [joined]);
  useEffect(() => {
    if (!joined || !run?.id) return;
    const runId = run.id;
    let stopped = false;
    const controller = new AbortController();
    let packet: { op: string; runId: string; seq: number; input: Input } | null = null;
    const poll = async () => {
      if (stopped || inFlight.current || document.hidden) return;
      inFlight.current = true;
      if (!packet) {
        let di = 0, dj = 0;
        for (const key of pressed.current) if (MOVE[key]) { di += MOVE[key][0]; dj += MOVE[key][1]; }
        const max = Math.max(1, Math.abs(di), Math.abs(dj));
        const spellKey = [...pressed.current].find((key) => /^[1-4]$/.test(key));
        packet = { op: "input", runId, seq: ++seq.current, input: { ...idleInput(), di: di / max, dj: dj / max, attack: latch.current.attack || pressed.current.has("j"), dodge: latch.current.dodge, spell: latch.current.spell ?? (spellKey ? Number(spellKey) - 1 : null), interact: latch.current.interact || pressed.current.has("f") } };
        latch.current = emptyLatch();
      }
      try {
        const reply = await api<Reply>("/api/gelisim/sefer", { body: packet, signal: controller.signal });
        packet = null;
        if (!stopped) { setCampaign(reply.campaign); setConnected(true); setError(""); }
      } catch (err) { if (!stopped) { setConnected(false); setError(err instanceof Error ? err.message : "Bağlantı bekleniyor."); } }
      finally { inFlight.current = false; }
    };
    const leave = () => { void fetch("/api/gelisim/sefer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "leave", runId }), keepalive: true }); };
    void poll(); const timer = window.setInterval(() => void poll(), 200);
    window.addEventListener("pagehide", leave);
    return () => { stopped = true; controller.abort(); window.clearInterval(timer); pressed.current.clear(); window.removeEventListener("pagehide", leave); };
  }, [joined, run?.id]);
  useEffect(() => {
    if (!joined) return;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable=true]")) return;
      const key = e.key.toLowerCase();
      if (MOVE[key] || ["j", "f", " ", "1", "2", "3", "4"].includes(key)) { e.preventDefault(); pressed.current.add(key); }
      if (key === "j" && !e.repeat) latch.current.attack = true;
      if (key === "f" && !e.repeat) latch.current.interact = true;
      if (/^[1-4]$/.test(key) && !e.repeat) latch.current.spell = Number(key) - 1;
      if (key === " " && !e.repeat) latch.current.dodge = true;
      if (key === "escape") pressed.current.clear();
    };
    const up = (e: KeyboardEvent) => pressed.current.delete(e.key.toLowerCase());
    const blur = () => pressed.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [joined]);
  const mutate = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const reply = await api<Reply>("/api/gelisim/sefer", { body });
      if (alive.current) { setCampaign(reply.campaign); setJoined(body.op !== "leave"); setConnected(true); }
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : "İşlem tamamlanamadı."); }
    finally { if (alive.current) setBusy(false); }
  };
  const leaveRun = async () => { setJoined(false); pressed.current.clear(); await mutate({ op: "leave", runId: run?.id }); };
  const spell = (slot: number) => { latch.current.spell = slot; };
  const boss = run?.enemies.find((e) => e.boss);
  const equipped = player && joined ? player.equipment : hero.equipment;
  return <div className={styles.world}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>İKİMİZİN RUTİNİ · MACERA GÜNLÜĞÜ</span><h1>{joined && region ? region.name : "Şatonun Ötesi"}</h1><p>{joined && run?.status === "waiting" ? "Yolculuk, ikiniz de aynı sefere katıldığınızda başlayacak." : joined ? "WASD / oklar: yürü · J / tık: saldır · 1–4: büyü · boşluk: kaçın · F: etkileşim / yardım" : "Dört yol. İki yol arkadaşı. Henüz anlatılmamış bir hikâye."}</p></div>
      <div className={styles.headerActions}><a className="btn btn-ghost" href="/gelisim">← Şatoya dön</a><button type="button" className="btn btn-ghost" aria-pressed={sound} onClick={() => void toggleSound()}>{sound ? "♫ Ses açık" : "♫ Ses aç"}</button><button type="button" className="btn btn-ghost" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen}>Savaş defteri</button></div>
    </header>
    <div className={styles.loadout}><b>{hero.name} · Sv. {player && joined ? player.level : hero.level}</b><span>⚔ {nameOf(equipped.weapon)} · {info.damage} hasar · ~{Math.round(info.dps)} hasar/sn</span><span>♥ {info.hp} can · ✦ {info.mana} mana</span><span>🛡 %{info.reduction} fiziksel koruma</span><span>✧ {campaign?.shards ?? 0} yıldız parçası</span></div>
    {guideOpen && <section className={styles.guide} aria-label="Savaş kuralları">
      <h2>Silahın, zırhın ve seviyen</h2>
      <p>Hasar, kuşandığın eşyanın açıldığı seviyeden hesaplanır. Yeni seviyelerde açılan silahları şatonun 3. katında kuşanabilirsin. Sefer sırasında ekipmanın sabit kalır. Gösterilen hasar/sn, kombo tamamlanırken ve hedefe isabet edilirken oluşan yaklaşık, düşman zırhından önceki değerdir.</p>
      <p>Kılıç ve hançerin son kombo vuruşu %80 daha güçlüdür. Ağır silahlar zırhın yarısını deler. Muhafızın önündeki kalkan fiziksel vuruşları azaltır; yanına geç veya saldırı sonrasını bekle. Büyüye karşı zırh savunmasının %35'i geçerlidir. Buz düşmanı yavaşlatır. Kaçınma kısa süre korur, 2,2 sn sonra yeniden kullanılabilir.</p>
      <p>Biriniz düşerse yanında durup F'yi 3 sn basılı tutun. İkiniz de düşerseniz toplanma noktasına dönersiniz; eşya kaybetmezsiniz. Ateş can ve mana yeniler ama bazen dumanı davetsiz misafirleri çeker. Savaş ödülleri rutin XP'sinden ayrıdır.</p>
      <table><thead><tr><th>Açılan ekipman</th><th>Seviye</th><th>Özellikler</th></tr></thead><tbody>{GEAR.filter((g) => g.level <= hero.level).map((g) => {
        const w = weaponStats(g.id), a = armorStats(g.id), s = spellStats(g.id);
        return <tr key={g.id}><td>{g.name}</td><td>{g.level}</td><td>{w ? `${w.damage} hasar · ${w.cooldown} sn · ${w.range} menzil${w.combo > 1 ? ` · ${w.combo}'lü kombo` : ""}` : a ? `${a.defense} savunma · +${a.bonusHp} can` : s ? `${s.heal ? `${s.heal} şifa` : `${s.damage} hasar`} · ${s.mana} mana · ${s.cooldown} sn` : ""}</td></tr>;
      })}</tbody></table>
      <p>Sıradaki silahlar: {GEAR.filter((g) => g.kind === "Silah" && g.level > hero.level).slice(0, 3).map((g) => `${g.name} (Sv. ${g.level})`).join(" · ") || "Bütün silahlar açıldı."}</p>
    </section>}
    {error && <p className={styles.error} role="alert">{error}{joined && !connected ? " · Bağlantı yeniden deneniyor." : ""}</p>}
    {joined && run?.status === "waiting" ? <section className={styles.result} role="status">
      <span className={styles.eyebrow}>YALNIZCA İKİNİZ BİRLİKTE</span><h2>Eşini bekliyorsun…</h2>
      <p>{region?.name} hazır. Eşin aynı sefere katıldığında başlayacak. Eşin ayrılırsa veya bağlantısı kesilirse savaş durur; ilerleme ve canlar korunur.</p>
      <p>{Object.values(run.players).map((p) => p.name).join(" & ")} · İki yol arkadaşının da burada olması gerekiyor.</p>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void leaveRun()}>Hazırlıktan ayrıl</button>
    </section> : joined && run && player && region ? <>
      <div className={styles.battlebar}>
        <div className={styles.vitals}><label>♥ {Math.ceil(player.hp)} / {player.maxHp}<progress value={player.hp} max={player.maxHp} /></label><label>✦ {Math.ceil(player.mana)} / {player.maxMana}<progress value={player.mana} max={player.maxMana} /></label>{player.shield > 0 && <small>Kalkan: {Math.ceil(player.shield)}</small>}</div>
        <div className={styles.spells}>{equipped.spells.map((id, slot) => { const s = spellStats(id)!, remaining = Math.max(0, (player.spellReady[id] ?? 0) - run.time); return <button type="button" key={id} disabled={remaining > 0 || player.mana < s.mana || player.hp <= 0} onClick={() => spell(slot)} title={`${nameOf(id)} · ${s.mana} mana`}><small>{slot + 1}</small>{nameOf(id)}<span>{remaining > 0 ? `${remaining.toFixed(1)} sn` : `${s.mana} mana`}</span></button>; })}{!equipped.spells.length && <small>Büyülerini şatoda kuşanabilirsin.</small>}</div>
        <button type="button" className="btn btn-ghost" onClick={() => void leaveRun()} disabled={busy}>Seferden ayrıl</button>
      </div>
      <Battlefield run={run} heroId={hero.id} pressed={pressed} latch={latch} />
      <div className={styles.journal}>
        <div><span className={styles.eyebrow}>YOLCULUK · {DIFFICULTIES[run.difficulty].name} · HEDEF SV. {expectedLevel(region, run.difficulty)}</span><ol>{region.objectives.map((q, n) => <li key={q.name} className={run.objectives.includes(n) ? styles.done : ""}>{run.objectives.includes(n) ? "✓ " : "◇ "}<b>{q.name}</b><span>{q.text}</span></li>)}</ol></div>
        <div className={styles.feed} role="log" aria-live="polite">{run.notices.slice(-3).map((n) => <p key={n.id} className={n.kind === "danger" ? styles.danger : ""}>{n.text}</p>)}<small>{run.kills} düşman yenildi · Yalnızca birlikte oynanır</small></div>
      </div>
      {boss && boss.awake && boss.hp > 0 && <div className={styles.bossbar}><b>{region.boss} · {boss.phase}. evre</b><progress value={boss.hp} max={boss.maxHp} /><span>{Math.ceil(boss.hp)} / {boss.maxHp}</span></div>}
      {run.status !== "active" && <section className={styles.result} role="status"><span className={styles.eyebrow}>{run.status === "won" ? "BÖLÜM TAMAMLANDI" : "BİRLİKTE YENİDEN"}</span><h2>{run.status === "won" ? region.trophy : "Bir el daha uzanır."}</h2><p>{run.status === "won" ? region.ending : "Eşyalarınız ve tamamlanan hedefleriniz korundu. Boss yeniden güç topladı."}</p>{run.status === "lost" ? <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void mutate({ op: "recover", runId: run.id })}>Toplanma noktasında ayağa kalk</button> : <button type="button" className="btn btn-primary" onClick={() => void leaveRun()}>Yol haritasına dön</button>}</section>}
    </> : <>
      {run && (run.status === "active" || run.status === "waiting") && <section className={styles.invitation}><div><b>{regionOf(run.region)!.name} · Eşinin yolculuğuna katıl</b><p>İkiniz de hazır olduğunuzda başlayacak. Yalnız giriş yok.</p></div><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void mutate({ op: "join", runId: run.id })}>Eşimle sefere katıl</button></section>}
      <div className={styles.difficulties} role="group" aria-label="Sefer zorluğu">{DIFFICULTIES.map((d) => <button type="button" key={d.id} aria-pressed={difficulty === d.id} onClick={() => setDifficulty(d.id)}><b>{d.name}</b><small>{d.desc}</small></button>)}</div>
      <div className={styles.regions}>{REGIONS.slice(0, visibleCount).map((r) => { const locked = canEnter(campaign ?? emptyCampaign(), r.id, difficulty, hero.level); return <article key={r.id} className={styles.region}>
        <RegionPreview region={r} /><div className={styles.regionBody}><span className={styles.eyebrow}>BÖLÜM {String(r.chapter).padStart(2, "0")} · ÖNERİLEN SV. {expectedLevel(r, difficulty)} {campaign?.completed.includes(r.id) ? "· ✓ TAMAMLANDI" : ""}</span><h2>{r.name}</h2><p className={styles.subtitle}>{r.subtitle}</p><p>{r.story}</p><ul>{r.objectives.map((q) => <li key={q.name}>{q.name}</li>)}</ul><div className={styles.bossName}>♜ {r.boss}</div><p className={styles.reward}>Hatıra: {r.trophy}</p><button type="button" className="btn btn-primary" disabled={busy || !!locked || !!(run && (run.status === "active" || run.status === "waiting") && Object.values(run.players).some((p) => !p.left && Date.now() / 1000 - p.seenAt < 3))} onClick={() => void mutate({ op: "start", region: r.id, difficulty })}>{locked ?? "Birlikte sefer hazırla →"}</button></div>
      </article>; })}</div>
      {visibleCount < REGIONS.length && <button type="button" className="btn btn-ghost" onClick={() => setVisibleCount((n) => n + 8)}>Diğer yolları göster</button>}
      {!!campaign?.trophies.length && <section className={styles.trophies}><h2>Birlikte kazandıklarınız</h2>{campaign.trophies.map((t) => <span key={t}>✦ {t}</span>)}</section>}
    </>}
  </div>;
}
