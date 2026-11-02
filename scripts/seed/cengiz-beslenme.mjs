// Cengiz'in "Ekmeksiz 7 günlük akşam yemek sistemi" (kullanıcının verdiği liste).
// Yalnızca kurulumda bir kez yazılır; sonrasında her şey arayüzden düzenlenir.

// weekday: 0 = Pazartesi … 6 = Pazar
export const DINNERS = [
  {
    weekday: 0,
    items: ["200 gr tavuk", "5-6 yemek kaşığı pilav", "1 kase yoğurt", "Büyük salata"],
    note: "Pilav az yağlı olacak. Ekmek verilmeyecek.",
  },
  {
    weekday: 1,
    items: ["200 gr tavuk", "5-6 yemek kaşığı bulgur", "Cacık", "Salata"],
    note: "Bulgur az yağlı yapılacak. Ekmek olmayacak.",
  },
  {
    weekday: 2,
    items: ["220-250 gr tavuk", "7-8 yemek kaşığı pilav", "1 kase yoğurt", "Bol salata"],
    note: "Spor günü olduğu için pilav biraz fazla olabilir. Ekmek yine yok.",
  },
  {
    weekday: 3,
    items: ["3 haşlanmış yumurta veya az yağlı omlet", "1 orta boy haşlanmış patates", "1 kase yoğurt veya cacık", "Bol salata"],
    note: "Patates kızartma değil, haşlama olacak. Ekmek olmayacak.",
  },
  {
    weekday: 4,
    items: ["200 gr tavuk", "5-6 yemek kaşığı pilav veya bulgur", "Cacık", "Bol salata"],
    note: "Tavuk kızartma değil; haşlama, fırın, ızgara veya az yağlı tavada yapılacak.",
  },
  {
    weekday: 5,
    items: ["Nohut, mercimek veya kuru fasulye", "4-5 yemek kaşığı bulgur", "1 kase yoğurt", "Salata"],
    note: "Yemeğin yağı az olacak. Ekmek olmayacak.",
  },
  {
    weekday: 6,
    items: ["200 gr tavuk", "1 orta boy haşlanmış patates", "Yoğurt veya cacık", "Bol salata"],
    note: "Patates kızartma yapılmayacak. Ekmek konulmayacak.",
  },
];

export const NOTES = [
  {
    title: "Ana kurallar",
    lines: [
      "Ekmek yok.",
      "Lavaş, dürüm, bazlama, simit, tost yok.",
      "Hamur işi yok.",
      "Makarna yok.",
      "Kızartma yok.",
      "Patates kızartması yok.",
      "Tatlı yok.",
      "Kola, meyve suyu ve şekerli içecek yok.",
      "Pilav ve bulgur az olacak.",
      "Yoğurt ve salata bol olacak.",
    ],
  },
  {
    title: "Günlük içecek planı",
    lines: [
      "Günlük 3 litre su içilecek.",
      "Spor günlerinde 3,5 litreye çıkabilir.",
      "Günde 1 bardak limonlu su içilebilir.",
      "Günde 1-2 fincan şekersiz yeşil çay içilebilir.",
      "Günde 1 şişe sade maden suyu içilebilir.",
    ],
  },
  {
    title: "Yemekle beraber içilebilir",
    lines: ["Su", "Ayran", "Sade maden suyu"],
  },
  {
    title: "En net özet",
    lines: [
      "Ekmek yok.",
      "Kızartma yok.",
      "Tatlı yok.",
      "Şekerli içecek yok.",
      "Pilav ve bulgur az.",
      "Yoğurt ve salata bol.",
      "Tavuk haşlama, fırın, ızgara veya az yağlı tavada olacak.",
    ],
  },
];

// 250 ml bardak: 12 bardak = 3 L, 14 bardak = 3,5 L
export const WATER = { glassMl: 250, target: 12, targetSport: 14 };

/** Beslenme planını, notları ve su hedefini yazar. Kullanıcının zaten planı varsa dokunmaz. */
export async function seedNutrition(client, userId) {
  const { rows } = await client.query(
    `select count(*)::int as n from meal_plan_items i join meal_plans p on p.id = i.plan_id
     where p.user_id = $1 and not p.is_template`,
    [userId],
  );
  if (rows[0].n > 0) return false;

  const plan = await client.query(
    `insert into meal_plans (user_id, name) values ($1, 'Ekmeksiz 7 günlük akşam sistemi')
     on conflict (user_id) where not is_template do update set name = excluded.name returning id`,
    [userId],
  );
  for (const d of DINNERS) {
    await client.query(
      "insert into meal_plan_items (plan_id, user_id, weekday, meal, items, note) values ($1, $2, $3, 'aksam', $4, $5)",
      [plan.rows[0].id, userId, d.weekday, d.items, d.note],
    );
  }
  const notes = await client.query("select count(*)::int as n from nutrition_notes where user_id = $1", [userId]);
  if (notes.rows[0].n === 0) {
    for (const [i, n] of NOTES.entries()) {
      await client.query("insert into nutrition_notes (user_id, title, lines, sort_order) values ($1, $2, $3, $4)", [
        userId,
        n.title,
        n.lines,
        i + 1,
      ]);
    }
  }
  await client.query("update users set water_glass_ml = $1, water_target = $2, water_target_sport = $3 where id = $4", [
    WATER.glassMl,
    WATER.target,
    WATER.targetSport,
    userId,
  ]);
  return true;
}
