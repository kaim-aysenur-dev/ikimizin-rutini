// Cengiz'in cilt bakım ürünleri (önem sırasıyla) ve haftalık takip grupları.
// Bu veri yalnızca kurulumda bir kez veritabanına yazılır; sonrasında arayüzden düzenlenir.

export const PRODUCTS = [
  {
    key: "foam",
    name: "Facial Cleansing Foam",
    brand: "OXO",
    purpose: "Yüz yıkama",
    area: "Yüz, boyun ve göğüs üstü",
    duration: "30–60 sn başlıkla dairesel masaj, sonra durula",
    usage_time: "Sabah + akşam",
    ingredients: "Niasinamid, aloe vera, yeşil çay, pantenol, yumuşak temizleyiciler",
    note: "",
    timers: [60],
  },
  {
    key: "serum",
    name: "Longevity Serum",
    brand: "OXO",
    purpose: "Yüz ve boyun bakımı",
    area: "Yüz ve boyun (göz çevresi hariç)",
    duration: "1–2 dk emilmesini bekle, durulanmaz, sonra krem",
    usage_time: "Sabah + akşam",
    ingredients:
      "Yüksek oranda niasinamid, birkaç formda hyaluronik asit, pantenol, ferulik asit, ayı üzümü, yeşil çay",
    note: "",
    timers: [120],
  },
  {
    key: "atoderm",
    name: "Atoderm Cream Ultra",
    brand: "Bioderma",
    purpose: "Nemlendirici",
    area: "Yüz ve vücut, özellikle kuru bölgeler",
    duration: "Sürüp bırak, ince kat",
    usage_time: "Sabah + akşam",
    ingredients: "Parfümsüz; gliserin, E vitamini, niasinamid, omega 3-6-9",
    note: "",
    timers: [],
  },
  {
    key: "deo",
    name: "Aura Deo Roll-on",
    brand: "OXO",
    purpose: "Koltuk altı koku kontrolü",
    area: "Temiz ve kuru koltuk altı",
    duration: "1–2 dk kurumasını bekle, sonra giyin",
    usage_time: "Sabah",
    ingredients: "Alüminyumsuz; çinko risinoleat, oktenidin, aloe vera",
    note: "Teri kesmez, sadece kokuyu önler. Tıraştan hemen sonra sürülmez.",
    timers: [120],
  },
  {
    key: "paste",
    name: "Whitening Toothpaste",
    brand: "OXO",
    purpose: "Diş temizliği",
    area: "Dişler ve diş eti çizgisi",
    duration: "2 dk",
    usage_time: "Sabah",
    ingredients: "İçerik listesinde florür yok",
    note: "İçerik listesinde florür yok; akşam florürlü bir macun kullanılmalı.",
    timers: [120],
  },
  {
    key: "shampoo",
    name: "Regenerating Hair Shampoo",
    brand: "OXO",
    purpose: "Saç yıkama",
    area: "Islak saç ve saç derisi",
    duration: "2–3 dk masaj, bekle, durula",
    usage_time: "Duşta",
    ingredients: "Bitkisel proteinler, amino asitler, pantenol, zeytin yaprağı, papatya",
    note: "",
    timers: [180],
  },
  {
    key: "soap",
    name: "Niaouli Süngerli Sabun",
    brand: "OXO",
    purpose: "Vücut temizliği",
    area: "Vücut, eller, ayaklar, sırt (yüze değil)",
    duration: "Yaklaşık 1 dk köpürt, durula",
    usage_time: "Duşta",
    ingredients: "Niaouli yağı, gliserin, doğal sünger",
    note: "",
    timers: [60],
  },
  {
    key: "repair",
    name: "Repair Cream",
    brand: "OXO",
    purpose: "Onarıcı bakım",
    area: "Tıraş bölgesi, eller, dirsek, topuk",
    duration: "Sürüp bırak",
    usage_time: "Gerektiğinde",
    ingredients: "Aynısefa, sarı kantaron, shea yağı, pantenol, allantoin, E vitamini",
    note: "",
    timers: [],
  },
  {
    key: "hairserum",
    name: "Regenerating Hair Serum",
    brand: "OXO",
    purpose: "Saç yağ bakımı",
    area: "Saç dibinden uçlara",
    duration: "En az 60 dk beklet, sonra şampuanla yıka",
    usage_time: "Haftada 1–2",
    ingredients: "Argan, tatlı badem ve ayçiçek yağı, sarımsak ekstresi, E vitamini",
    note: "",
    timers: [3600],
  },
  {
    key: "mask",
    name: "HydraShield Face Mask",
    brand: "OXO",
    purpose: "Yoğun nem",
    area: "Temiz yüz",
    duration: "15–20 dk, sonra kalan esansı vurarak yedir, durulanmaz",
    usage_time: "Haftada 1–2, akşam",
    ingredients: "C vitamini, shea yağı, betain, biberiye",
    note: "",
    timers: [900, 1200],
  },
  {
    key: "hametan",
    name: "Hametan Krem",
    brand: "Abdi İbrahim",
    purpose: "Kesik, yanık, tahriş için ilaç",
    area: "Sadece sorunlu nokta, gözlere değmesin",
    duration: "İnce kat, günde birkaç kez, durulanmaz",
    usage_time: "Gerektiğinde",
    ingredients: "%5,35 Hamamelis virginiana (cadı fındığı)",
    note: "İlaçtır, günlük krem gibi kullanılmaz.",
    timers: [],
  },
];

// slot → adımlar (sırasıyla). product: ürün anahtarı ya da null (ürünsüz adım)
export const ROUTINE = {
  sabah: [
    { product: "foam", label: "Yüz köpüğü" },
    { product: "serum", label: "Serum" },
    { product: "atoderm", label: "Atoderm" },
    { product: "deo", label: "Deodorant" },
    { product: "paste", label: "Diş" },
  ],
  aksam: [
    { product: "foam", label: "Yüz köpüğü" },
    { product: "serum", label: "Serum" },
    { product: "atoderm", label: "Atoderm" },
    {
      product: null,
      label: "Diş (florürlü macun)",
      detail: "Dişler ve diş eti çizgisi · 2 dk · florürlü macunla",
      timers: [120],
    },
  ],
  dus: [
    { product: "shampoo", label: "Şampuan" },
    { product: "soap", label: "Sabun" },
  ],
  haftalik: [
    { product: "hairserum", label: "Saç serumu", target: 2 },
    { product: "mask", label: "Maske", target: 2 },
  ],
  gerektiginde: [
    { product: "repair", label: "Repair Cream" },
    { product: "hametan", label: "Hametan" },
  ],
};

/** Ürünleri ve rutin adımlarını kullanıcıya yazar. Kullanıcının zaten ürünü varsa dokunmaz. */
export async function seedSkin(client, userId) {
  const { rows } = await client.query("select count(*)::int as n from products where user_id = $1", [userId]);
  if (rows[0].n > 0) return false;

  const ids = {};
  for (const [i, p] of PRODUCTS.entries()) {
    const res = await client.query(
      `insert into products (user_id, name, brand, image_url, purpose, area, duration, usage_time,
                             ingredients, note, timer_seconds, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
      [userId, p.name, p.brand, `/products/${p.key}.webp`, p.purpose, p.area, p.duration, p.usage_time,
       p.ingredients, p.note, p.timers, i + 1],
    );
    ids[p.key] = res.rows[0].id;
  }

  for (const [slot, steps] of Object.entries(ROUTINE)) {
    for (const [i, step] of steps.entries()) {
      await client.query(
        `insert into routine_items (user_id, product_id, slot, label, detail, weekly_target, timer_seconds, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, step.product ? ids[step.product] : null, slot, step.label, step.detail ?? "",
         step.target ?? null, step.timers ?? [], i + 1],
      );
    }
  }
  return true;
}
