import "server-only";
import { imageUrl } from "./cloudinary";
import { addDays, diffDays } from "./dates";
import { sql } from "./db";
import { streakAndDays } from "./overview";
import { type Goal, MAX_ACTIVE, type Metric, type Progress, TIERS, type Tier, type Wish, type WishCat, type WishStatus, goalsMet } from "./wishes";

// Dilek Dolabı. Görünürlük: herkes yalnız kendi dileklerini ve ikinizin ortak dileklerini görür.
// Düzenleme ve eylemler yalnız sahibinde.

type U = { id: string; accountId: string };

/** Kişinin [from, to] günlerindeki ölçütleri. tam_gun yalnız istenirse hesaplanır (ağır) */
async function metricsOf(userId: string, from: string, to: string, today: string, withFull: boolean): Promise<Partial<Record<Metric, number>>> {
  const [[r], full] = await Promise.all([
    sql()`
      select
        (select count(*) from sport_sessions where user_id = ${userId} and day between ${from} and ${to})::int as spor_seans,
        (select coalesce(sum(minutes), 0) from sport_sessions where user_id = ${userId} and day between ${from} and ${to})::int as spor_dk,
        (select coalesce(sum(minutes), 0) from study_sessions where user_id = ${userId} and day between ${from} and ${to})::int as calisma_dk,
        (select coalesce(sum(pages), 0) from study_sessions where user_id = ${userId} and day between ${from} and ${to})::int as sayfa,
        (select coalesce(sum(minutes) filter (where together), 0) from study_sessions where user_id = ${userId} and day between ${from} and ${to})::int as birlikte_dk,
        (select count(distinct day) from checks where user_id = ${userId} and day between ${from} and ${to})::int as cilt_gun,
        (select count(*) from nutrition_days n join users u on u.id = n.user_id
          where n.user_id = ${userId} and n.day between ${from} and ${to} and n.water_glasses >= u.water_target)::int as su_gun,
        (select count(*) from face_yoga_sessions where user_id = ${userId} and day between ${from} and ${to})::int as yuz_yogasi,
        (select count(*) from meal_checks where user_id = ${userId} and day between ${from} and ${to})::int as ogun,
        (select count(*) from (
          select day from checks where user_id = ${userId} and day between ${from} and ${to}
          union select day from meal_checks where user_id = ${userId} and day between ${from} and ${to}
          union select day from sport_sessions where user_id = ${userId} and day between ${from} and ${to}
          union select day from study_sessions where user_id = ${userId} and day between ${from} and ${to}
          union select day from face_yoga_sessions where user_id = ${userId} and day between ${from} and ${to}
        ) d)::int as aktif_gun`,
    withFull ? streakAndDays(userId, today, Math.max(130, diffDays(today, from) + 1)) : null,
  ]);
  const out: Partial<Record<Metric, number>> = { ...r };
  if (full) out.tam_gun = [...full.done].filter((d) => d >= from && d <= to).length;
  return out;
}

type Row = Record<string, unknown> & { id: string; user_id: string; goals: Goal[]; days: number; status: WishStatus; start_day: string | null; shared: boolean };

/** Hesaptaki bütün dilekler; görevdekilerin ilerlemesi hesaplanır, tamamlananlar burada "kazanıldı"ya geçer */
export async function wishOverview(user: U, today: string): Promise<{ wishes: Wish[] }> {
  const [rows, members] = await Promise.all([
    sql()`
      select w.id, w.user_id, w.title, w.brand, w.category, w.tier, w.price, w.link, w.note, w.photo, w.shared, w.goals, w.days, w.status,
        to_char(w.start_day, 'YYYY-MM-DD') as start_day, w.attempts, w.earned_at, w.claimed_at
      from wishes w join users u on u.id = w.user_id
      where u.account_id = ${user.accountId} and (w.user_id = ${user.id} or w.shared) order by w.created_at`,
    sql()`select id from users where account_id = ${user.accountId} order by created_at`,
  ]) as unknown as [Row[], { id: string }[]];

  const wishes = await Promise.all(rows.map(async (r): Promise<Wish> => {
    const goals = r.goals;
    const end = r.start_day ? addDays(r.start_day, r.days - 1) : null;
    let status = r.status, earnedAt = r.earned_at ? new Date(r.earned_at as string).toISOString() : null;
    let progress: Progress[] = [];
    if (r.start_day && end && (status === "gorevde" || status === "kazanildi")) {
      const who = r.shared ? members.map((m) => m.id) : [r.user_id];
      const to = today < end ? today : end;
      const full = goals.some((g) => g.metric === "tam_gun");
      progress = await Promise.all(who.map(async (id) => ({ userId: id, values: today < r.start_day! ? {} : await metricsOf(id, r.start_day!, to, today, full) })));
      if (status === "gorevde" && progress.every((p) => goalsMet(goals, p.values))) {
        const [done] = await sql()`update wishes set status = 'kazanildi', earned_at = now() where id = ${r.id} and status = 'gorevde' returning earned_at`;
        if (done) { status = "kazanildi"; earnedAt = new Date(done.earned_at).toISOString(); }
      }
    }
    return {
      id: r.id, userId: r.user_id, title: r.title as string, brand: r.brand as string, cat: r.category as WishCat, tier: r.tier as Tier,
      price: r.price as number | null, link: r.link as string, note: r.note as string,
      photo: r.photo ? imageUrl(r.photo as string, { width: 480, height: 480, crop: "fill" }) : null, photoId: (r.photo as string | null) ?? null,
      shared: r.shared, goals, days: r.days, status, startDay: r.start_day, endDay: end,
      daysLeft: end && status === "gorevde" ? Math.max(0, diffDays(end, today) + 1) : null,
      expired: status === "gorevde" && !!end && today > end, attempts: r.attempts as number,
      earnedAt, claimedAt: r.claimed_at ? new Date(r.claimed_at as string).toISOString() : null,
      progress,
    };
  }));
  return { wishes };
}

/* ------------------------------- düzenleme ------------------------------- */

export type WishInput = {
  title: string; brand: string; cat: WishCat; tier: Tier; price: number | null; link: string; note: string;
  photo: string | null; shared: boolean; goals: Goal[];
};

export async function createWish(user: U, w: WishInput): Promise<string | { error: string }> {
  const [{ n }] = await sql()`select count(*)::int as n from wishes where user_id = ${user.id}`;
  if (n >= 60) return { error: "Dolap dolu: en fazla 60 dilek." };
  const [r] = await sql()`
    insert into wishes (user_id, title, brand, category, tier, price, link, note, photo, shared, goals, days)
    values (${user.id}, ${w.title}, ${w.brand}, ${w.cat}, ${w.tier}, ${w.price}, ${w.link}, ${w.note}, ${w.photo}, ${w.shared}, ${JSON.stringify(w.goals)}::jsonb, ${TIERS[w.tier].days})
    returning id`;
  return r.id;
}

/** Görevdeyken yalnız görünüş (ad, marka, bağlantı, not, fotoğraf, fiyat) değişir; koşullar kilitli */
export async function updateWish(user: U, id: string, w: WishInput): Promise<{ ok: true; oldPhoto: string | null } | { error: string; status: number }> {
  const [cur] = await sql()`select status, photo from wishes where id = ${id} and user_id = ${user.id}`;
  if (!cur) return { error: "Dilek bulunamadı.", status: 404 };
  if (cur.status === "dilek") {
    await sql()`
      update wishes set title = ${w.title}, brand = ${w.brand}, category = ${w.cat}, tier = ${w.tier}, price = ${w.price}, link = ${w.link},
        note = ${w.note}, photo = ${w.photo}, shared = ${w.shared}, goals = ${JSON.stringify(w.goals)}::jsonb, days = ${TIERS[w.tier].days}
      where id = ${id}`;
  } else {
    await sql()`
      update wishes set title = ${w.title}, brand = ${w.brand}, category = ${w.cat}, price = ${w.price}, link = ${w.link}, note = ${w.note}, photo = ${w.photo}
      where id = ${id}`;
  }
  return { ok: true, oldPhoto: cur.photo !== w.photo ? cur.photo : null };
}

export async function deleteWish(user: U, id: string): Promise<{ photo: string | null } | null> {
  const [r] = await sql()`delete from wishes where id = ${id} and user_id = ${user.id} returning photo`;
  return r ? { photo: r.photo } : null;
}

/* --------------------------------- eylemler -------------------------------- */

export type WishAction = "baslat" | "yeniden" | "birak" | "aldim" | "almadim";

export async function wishAction(user: U, id: string, action: WishAction, today: string): Promise<{ ok: true } | { error: string; status: number }> {
  const [w] = await sql()`
    select w.user_id, w.status, w.shared from wishes w join users u on u.id = w.user_id
    where w.id = ${id} and u.account_id = ${user.accountId} and (w.user_id = ${user.id} or w.shared)`;
  if (!w) return { error: "Dilek bulunamadı.", status: 404 };
  const mine = w.user_id === user.id;

  if (!mine) return { error: "Bu dilek senin değil.", status: 403 };

  if (action === "baslat" || action === "yeniden") {
    if (action === "baslat" && w.status !== "dilek") return { error: "Bu görev zaten başladı.", status: 409 };
    if (action === "yeniden" && w.status !== "gorevde") return { error: "Yalnız süren görev yeniden başlar.", status: 409 };
    if (action === "baslat") {
      // ortak dilekler ikinize de sayılır
      const [{ n }] = await sql()`
        select count(*)::int as n from wishes w join users u on u.id = w.user_id
        where u.account_id = ${user.accountId} and w.status = 'gorevde' and (w.user_id = ${user.id} or w.shared)`;
      if (n >= MAX_ACTIVE) return { error: `Aynı anda en fazla ${MAX_ACTIVE} görev: önce birini bitir ya da bırak.`, status: 409 };
    }
    await sql()`update wishes set status = 'gorevde', start_day = ${today}, attempts = attempts + 1 where id = ${id}`;
    return { ok: true };
  }
  if (action === "birak") {
    if (w.status !== "gorevde") return { error: "Süren bir görev yok.", status: 409 };
    await sql()`update wishes set status = 'dilek', start_day = null where id = ${id}`;
    return { ok: true };
  }
  if (action === "aldim") {
    if (w.status !== "kazanildi") return { error: "Önce görevi tamamla.", status: 409 };
    await sql()`update wishes set status = 'alindi', claimed_at = now() where id = ${id}`;
    return { ok: true };
  }
  if (w.status !== "alindi") return { error: "Henüz alınmadı.", status: 409 };
  await sql()`update wishes set status = 'kazanildi', claimed_at = null where id = ${id}`;
  return { ok: true };
}

/** Odadaki vitrin için: kişinin kazandığı ödüllerin kategorileri (en yeniler önce) */
export async function trophiesOf(userId: string): Promise<WishCat[]> {
  const rows = await sql()`
    select category from wishes w where (w.user_id = ${userId} or (w.shared and w.user_id in (select id from users where account_id = (select account_id from users where id = ${userId}))))
      and status in ('kazanildi', 'alindi') order by earned_at desc limit 12`;
  return rows.map((r) => r.category as WishCat);
}
