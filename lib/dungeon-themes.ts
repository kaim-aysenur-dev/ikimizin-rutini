// Zindan temaları: VERİ. Zemin, duvar, ışık rengi, havadaki parçacıklar, süslerin renkleri ve karanlık tonu.
// Yeni tema için bir kayıt eklemek yeter; harita karakterleri (R, T, c...) temanın renkleriyle çizilir.
export type ThemeId = "magara" | "orman" | "bataklik" | "yuva" | "mezar" | "kuyu" | "kamp" | "kule" | "buz" | "kopru" | "ocak" | "kale" | "cukur" | "mahzen" | "ejder" | "kanay"
  | "col" | "piramit" | "deniz" | "kristal" | "gotik" | "kapadokya" | "bulut" | "cehennem";
export type Particle = "toz" | "atesbocegi" | "spor" | "kul" | "kar" | "sis" | "kivilcim" | "kan" | "yaprak" | "kum" | "kabarcik";

export type DungeonTheme = {
  floor: [string, string]; // dama zemin
  speck: string; // zemindeki küçük ayrıntı (çakıl, yaprak, kemik)
  wall: string; // arka duvarlar ve taş bloklar
  light: string; // meşale ve mangal ışığı (r,g,b)
  rock: string; tree: [string, string] | null; // kaya; ağaç gövdesi ve yaprağı (null: ölü ağaç)
  crystal: string; pool: [string, string]; // kristal; göl (zehir, kan) renkleri
  particles: Particle; dark: string; // havadaki parçacık; karanlık örtüsü (rgba)
  music?: string; // ileride: tema müziği
  abyss?: [string, string]; // uçurum karesinin rengi (su, gökyüzü, lav çukuru)
  tallRock?: boolean; // kayalar uzun sivri (Kapadokya peri bacası, sarkıt)
};

export const THEMES: Record<ThemeId, DungeonTheme> = {
  magara: { floor: ["#3a3430", "#342e2a"], speck: "#4e463e", wall: "#2a2420", light: "255,170,90", rock: "#4a423c", tree: null, crystal: "#8ad0ff", pool: ["#2a3a4a", "#22303e"], particles: "toz", dark: "rgba(10,8,14,0.38)" },
  orman: { floor: ["#24382a", "#203226"], speck: "#3a5a40", wall: "#1a2a1e", light: "200,230,170", rock: "#4a4e4a", tree: ["#2a1e16", "#1e3a26"], crystal: "#b8f0a0", pool: ["#1e3448", "#24405a"], particles: "atesbocegi", dark: "rgba(8,14,20,0.36)" },
  bataklik: { floor: ["#26302a", "#202a24"], speck: "#3a4a2a", wall: "#1a221c", light: "150,240,120", rock: "#3e443a", tree: null, crystal: "#9fe85a", pool: ["#3a6a2a", "#4a8a32"], particles: "spor", dark: "rgba(8,16,10,0.4)" },
  yuva: { floor: ["#2e2a2e", "#282428"], speck: "#4a444a", wall: "#201c22", light: "210,210,230", rock: "#3e3a40", tree: null, crystal: "#c9a6f0", pool: ["#2a2a3a", "#22222e"], particles: "toz", dark: "rgba(8,6,12,0.42)" },
  mezar: { floor: ["#2e2e30", "#28282a"], speck: "#46464a", wall: "#222226", light: "120,230,180", rock: "#4a4a50", tree: null, crystal: "#7ae8c8", pool: ["#1e2a2a", "#182222"], particles: "sis", dark: "rgba(8,12,14,0.42)" },
  kuyu: { floor: ["#2a2a34", "#24242e"], speck: "#3e3e4a", wall: "#1c1c26", light: "140,200,255", rock: "#3a3a46", tree: null, crystal: "#8ad0ff", pool: ["#0a0a12", "#06060c"], particles: "toz", dark: "rgba(6,6,14,0.45)" },
  kamp: { floor: ["#4a3a2a", "#423424"], speck: "#5a4a34", wall: "#2e2418", light: "255,150,70", rock: "#5a4a3a", tree: null, crystal: "#f0a24a", pool: ["#3a2a1a", "#2e2214"], particles: "kivilcim", dark: "rgba(14,8,4,0.3)" },
  kule: { floor: ["#2e2638", "#282232"], speck: "#40364e", wall: "#221c2e", light: "170,120,255", rock: "#3a3448", tree: null, crystal: "#c9a6f0", pool: ["#2a1e3a", "#22182e"], particles: "kivilcim", dark: "rgba(10,6,18,0.38)" },
  buz: { floor: ["#3a4a5a", "#344454"], speck: "#c8e0f0", wall: "#24323e", light: "160,220,255", rock: "#e8f4ff", tree: null, crystal: "#8ad8ff", pool: ["#5a8ab0", "#4a7aa0"], particles: "kar", dark: "rgba(8,14,24,0.3)" },
  kopru: { floor: ["#4a3a2e", "#423428"], speck: "#5a4a3a", wall: "#2a2a34", light: "180,190,230", rock: "#4a4a56", tree: null, crystal: "#8ad0ff", pool: ["#16202e", "#1a2638"], particles: "sis", dark: "rgba(8,10,18,0.36)" },
  ocak: { floor: ["#3a302a", "#342a24"], speck: "#5a4434", wall: "#241a14", light: "255,130,50", rock: "#4a3a30", tree: null, crystal: "#ffb040", pool: ["#c8461e", "#e8601e"], particles: "kul", dark: "rgba(14,6,2,0.32)" },
  kale: { floor: ["#34343e", "#2e2e38"], speck: "#44444e", wall: "#24242e", light: "232,80,90", rock: "#4a4a56", tree: null, crystal: "#e83a4a", pool: ["#2a1a22", "#22141a"], particles: "toz", dark: "rgba(10,6,10,0.38)" },
  cukur: { floor: ["#3a2420", "#341e1a"], speck: "#5a2e24", wall: "#24120e", light: "255,110,50", rock: "#4a2a24", tree: null, crystal: "#ff6a30", pool: ["#c8461e", "#e8601e"], particles: "kul", dark: "rgba(16,4,2,0.32)" },
  mahzen: { floor: ["#262a30", "#20242a"], speck: "#3a3e46", wall: "#181c22", light: "110,230,200", rock: "#3a3e46", tree: null, crystal: "#7ae8c8", pool: ["#14221e", "#0e1a16"], particles: "sis", dark: "rgba(4,10,10,0.46)" },
  ejder: { floor: ["#3e3020", "#38291a"], speck: "#d8a840", wall: "#281c10", light: "255,170,60", rock: "#5a4430", tree: null, crystal: "#ffd040", pool: ["#c8461e", "#e8601e"], particles: "kivilcim", dark: "rgba(14,8,2,0.3)" },
  kanay: { floor: ["#2e1a20", "#28141a"], speck: "#4a2028", wall: "#1e0c12", light: "232,48,74", rock: "#3a2228", tree: null, crystal: "#e8304a", pool: ["#8a1424", "#a81a2e"], particles: "kan", dark: "rgba(14,2,6,0.4)" },
  col: { floor: ["#b8945a", "#ac8a52"], speck: "#d8b878", wall: "#7a5a34", light: "255,210,140", rock: "#c89a5a", tree: null, crystal: "#ffd060", pool: ["#c8a060", "#b89050"], particles: "kum", dark: "rgba(40,20,4,0.18)", abyss: ["#5a3a1a", "#4a2e14"] },
  piramit: { floor: ["#8a7048", "#806842"], speck: "#a88a5a", wall: "#5a4428", light: "255,190,90", rock: "#a8885a", tree: null, crystal: "#4ac8e8", pool: ["#3a6a8a", "#2e5a7a"], particles: "toz", dark: "rgba(20,10,2,0.34)" },
  deniz: { floor: ["#2a4a5a", "#244252"], speck: "#4a7a8a", wall: "#1a3240", light: "110,210,230", rock: "#3a5a6a", tree: null, crystal: "#f08aa8", pool: ["#1e5a7a", "#2a6a8a"], particles: "kabarcik", dark: "rgba(4,16,24,0.36)", abyss: ["#0e3450", "#124060"] },
  kristal: { floor: ["#2a2440", "#241e38"], speck: "#4a3e6a", wall: "#1a1430", light: "190,140,255", rock: "#3a3058", tree: null, crystal: "#c8a0ff", pool: ["#4a2a8a", "#5a3aa0"], particles: "kivilcim", dark: "rgba(10,4,20,0.4)", tallRock: true },
  gotik: { floor: ["#2a2630", "#24202a"], speck: "#3e3846", wall: "#1a1620", light: "232,120,140", rock: "#3a3440", tree: null, crystal: "#e83a5a", pool: ["#4a1424", "#5a1a2e"], particles: "sis", dark: "rgba(10,4,10,0.42)" },
  kapadokya: { floor: ["#a8805a", "#9c7652"], speck: "#c89a70", wall: "#6a4a30", light: "255,190,120", rock: "#d8b08a", tree: null, crystal: "#ffb060", pool: ["#6a4a30", "#5a3e28"], particles: "toz", dark: "rgba(30,14,4,0.26)", tallRock: true },
  bulut: { floor: ["#d8e0ec", "#ccd6e4"], speck: "#ffffff", wall: "#a8b8cc", light: "255,240,200", rock: "#e8eef6", tree: null, crystal: "#ffe08a", pool: ["#8ab8e8", "#a8c8f0"], particles: "kar", dark: "rgba(40,50,80,0.12)", abyss: ["#6a9ad8", "#7aaae8"] },
  cehennem: { floor: ["#2a1410", "#24100c"], speck: "#4a2014", wall: "#160806", light: "255,90,40", rock: "#2a1814", tree: null, crystal: "#ff5a20", pool: ["#d84a1a", "#f06a20"], particles: "kul", dark: "rgba(20,2,0,0.34)", abyss: ["#a82a10", "#c83a14"], tallRock: true },
};
