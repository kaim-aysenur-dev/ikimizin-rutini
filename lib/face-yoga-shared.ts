// Yüz yogası: egzersizler ve hazır rutinler. Sunucu ve tarayıcı birlikte kullanır.

export type FaceArea = "alin" | "goz" | "yanak" | "dudak" | "cene" | "boyun";

export const AREA_LABEL: Record<FaceArea, string> = {
  alin: "Alın",
  goz: "Göz çevresi",
  yanak: "Yanak",
  dudak: "Dudak",
  cene: "Çene",
  boyun: "Boyun",
};

export type FaceExercise = {
  id: string;
  name: string;
  area: FaceArea;
  seconds: number;
  steps: string[];
  tip: string;
};

export const EXERCISES: FaceExercise[] = [
  {
    id: "alin-duzlestirme",
    name: "Alın düzleştirme",
    area: "alin",
    seconds: 45,
    steps: [
      "İki elin parmak uçlarını alnının ortasına koy.",
      "Hafifçe bastırarak parmakları şakaklara doğru kaydır.",
      "Şakaklarda bir an bekle, tekrar ortadan başla.",
    ],
    tip: "Kaşlarını kaldırma; alın kası gevşek kalsın.",
  },
  {
    id: "kas-direnci",
    name: "Kaş kaldırma direnci",
    area: "alin",
    seconds: 45,
    steps: [
      "İşaret parmaklarını kaşlarının hemen üstüne yatay koy.",
      "Kaşlarını yukarı kaldırmaya çalışırken parmaklarınla hafifçe aşağı bastır.",
      "2 saniye tut, bırak. Süre bitene kadar tekrarla.",
    ],
    tip: "Baskı hafif olsun; amaç kası çalıştırmak, cildi çekiştirmek değil.",
  },
  {
    id: "goz-v",
    name: "Göz çevresi V",
    area: "goz",
    seconds: 45,
    steps: [
      "Orta parmaklarını kaşlarının iç ucuna, işaret parmaklarını dış ucuna koy (V şekli).",
      "Tavana bak ve alt göz kapaklarını yukarı doğru sık.",
      "10 saniye tut, gevşe. Üç kez yap.",
    ],
    tip: "Gözlerini sıkarken alnını kırıştırma.",
  },
  {
    id: "goz-tiklatma",
    name: "Göz altı tıklatma",
    area: "goz",
    seconds: 30,
    steps: [
      "Yüzük parmaklarını göz altlarının iç köşesine koy.",
      "Kemiğin üzerinde hafifçe tıklatarak dışa doğru ilerle.",
      "Şakaklara varınca baştan başla.",
    ],
    tip: "Sabah şişlik varsa iyi gelir. Göz kremi sürdükten sonra yapabilirsin.",
  },
  {
    id: "balon",
    name: "Balon yanak",
    area: "yanak",
    seconds: 45,
    steps: [
      "Ağzını kapat, yanaklarını havayla şişir.",
      "Havayı sağ yanağa, sol yanağa, üst dudağın altına ve alt dudağın altına sırayla taşı.",
      "Her noktada 2-3 saniye beklet.",
    ],
    tip: "Omuzların düşük ve rahat olsun.",
  },
  {
    id: "gulumseme",
    name: "Kapalı gülümseme",
    area: "yanak",
    seconds: 45,
    steps: [
      "Dudakların kapalıyken olabildiğince geniş gülümse.",
      "Yanaklarını göze doğru kaldırmaya çalış, 10 saniye tut.",
      "Gevşe ve tekrarla.",
    ],
    tip: "Dişlerini sıkma; çene rahat kalsın.",
  },
  {
    id: "balik",
    name: "Balık yüzü",
    area: "yanak",
    seconds: 30,
    steps: [
      "Yanaklarını içe çek, dudaklarını balık gibi büz.",
      "Bu haldeyken gülümsemeye çalış.",
      "5 saniye tut, gevşe, tekrarla.",
    ],
    tip: "Yanaklarda hafif bir yanma hissetmen normal.",
  },
  {
    id: "o-agzi",
    name: "O ağzı",
    area: "dudak",
    seconds: 30,
    steps: [
      "Ağzını O şeklinde aç, üst dudağını dişlerinin üzerine kapat.",
      "Yanak kaslarınla gülümseyerek yüzü yukarı kaldır.",
      "5 saniye tut, gevşe, tekrarla.",
    ],
    tip: "Hareket yanaklardan gelsin, alnın gevşek kalsın.",
  },
  {
    id: "tavana-opucuk",
    name: "Tavana öpücük",
    area: "dudak",
    seconds: 30,
    steps: [
      "Dik otur, başını yavaşça geriye yatırıp tavana bak.",
      "Dudaklarını öpücük verir gibi ileri uzat, 5 saniye tut.",
      "Gevşe ve tekrarla.",
    ],
    tip: "Boynunu zorlama; rahat edebildiğin kadar geri yat.",
  },
  {
    id: "cene-gevsetme",
    name: "Çene kası masajı",
    area: "cene",
    seconds: 45,
    steps: [
      "Dişlerini hafifçe ayır, çeneni gevşek bırak.",
      "Parmak boğumlarınla kulak önündeki çene kasına küçük daireler çiz.",
      "Gergin noktalarda biraz daha yavaşla.",
    ],
    tip: "Gün içinde dişlerini sıkıyorsan bu hareket özellikle iyi gelir.",
  },
  {
    id: "zurafa",
    name: "Zürafa",
    area: "cene",
    seconds: 45,
    steps: [
      "Başını hafifçe geri yatır, tavana bak.",
      "Alt dudağını üst dudağının üzerine doğru it, boynun önünde gerilim hisset.",
      "Parmak uçlarınla boyundan köprücük kemiğine doğru hafifçe sıvazla.",
    ],
    tip: "Ağrı olursa başını daha az geri yatır.",
  },
  {
    id: "dil-baskisi",
    name: "Dil baskısı",
    area: "cene",
    seconds: 30,
    steps: [
      "Dudaklar kapalı, dişler hafif ayrık dur.",
      "Dilinin tamamını damağına yasla ve hafifçe bastır.",
      "Çeneni biraz içe al, 5 saniye tut, gevşe.",
    ],
    tip: "Dişlere değil, damağa bastır.",
  },
  {
    id: "boyun-yan",
    name: "Boyun yan esneme",
    area: "boyun",
    seconds: 40,
    steps: [
      "Sağ kulağını sağ omzuna doğru yavaşça indir, 15 saniye bekle.",
      "Ortaya dön, aynısını sol tarafa yap.",
      "Omuzlarını kulaklarına doğru kaldırma.",
    ],
    tip: "Derin ve yavaş nefes al.",
  },
  {
    id: "sakak-masaji",
    name: "Şakak masajı",
    area: "alin",
    seconds: 30,
    steps: [
      "Orta parmaklarını şakaklarına koy.",
      "Yavaş daireler çizerek hafifçe bastır.",
      "Gözlerini kapatıp derin nefes al.",
    ],
    tip: "Seansı rahatlatarak bitirmek için iyi bir kapanış.",
  },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): FaceExercise | undefined {
  return BY_ID.get(id);
}

export type FaceRoutine = {
  id: string;
  name: string;
  description: string;
  color: "am" | "pm" | "shower" | "week";
  exercises: string[];
};

export const ROUTINES: FaceRoutine[] = [
  {
    id: "sabah",
    name: "Sabah uyanışı",
    description: "Göz altı şişliğini azaltmaya ve yüzü canlandırmaya yönelik kısa seans.",
    color: "am",
    exercises: ["goz-tiklatma", "alin-duzlestirme", "balon", "gulumseme", "balik", "cene-gevsetme"],
  },
  {
    id: "cene-boyun",
    name: "Çene ve boyun",
    description: "Çene hattı ve boyun için; dişlerini sıkıyorsan gerginliği de alır.",
    color: "shower",
    exercises: ["cene-gevsetme", "zurafa", "tavana-opucuk", "dil-baskisi", "o-agzi", "boyun-yan"],
  },
  {
    id: "aksam",
    name: "Akşam gevşeme",
    description: "Alın ve göz çevresindeki gerginliği bırakıp günü rahat kapatmak için.",
    color: "pm",
    exercises: ["alin-duzlestirme", "kas-direnci", "goz-v", "goz-tiklatma", "cene-gevsetme", "sakak-masaji"],
  },
  {
    id: "tam",
    name: "Tam seans",
    description: "Bütün egzersizler baştan sona. Haftada birkaç kez yeterli.",
    color: "week",
    exercises: EXERCISES.map((e) => e.id),
  },
];

const ROUTINE_BY_ID = new Map(ROUTINES.map((r) => [r.id, r]));

export function getRoutine(id: string): FaceRoutine | undefined {
  return ROUTINE_BY_ID.get(id);
}

export function routineExercises(routine: FaceRoutine): FaceExercise[] {
  return routine.exercises.map((id) => BY_ID.get(id)).filter((e): e is FaceExercise => !!e);
}

export function routineSeconds(routine: FaceRoutine): number {
  return routineExercises(routine).reduce((sum, e) => sum + e.seconds, 0);
}

/** Kayıtta tutulan kimlik: rutin ya da tek egzersiz */
export function isPracticeId(id: unknown): id is string {
  return typeof id === "string" && (ROUTINE_BY_ID.has(id) || BY_ID.has(id));
}

export function practiceName(id: string): string {
  return ROUTINE_BY_ID.get(id)?.name ?? BY_ID.get(id)?.name ?? "Yüz yogası";
}

export type FaceYogaSession = { id: string; day: string; routine: string; seconds: number };

export type FaceYogaOverview = {
  /** bu haftanın günleri (pazartesiden pazara) ve o gün yapılan süre */
  week: { day: string; seconds: number }[];
  /** bugünden (bugün yapılmadıysa dünden) geriye aralıksız yapılan gün sayısı */
  streak: number;
  recent: FaceYogaSession[];
};
