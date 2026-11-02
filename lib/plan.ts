// Kişi bazlı planlar. 2. aşamada örnek veridir; 3. aşamada veritabanındaki rutin, öğün ve spor kayıtlarından gelecek.
import type { Person } from "./scenes/types";

export const NAMES: Record<Person, string> = { cengiz: "Cengiz", aysenur: "Ayşenur" };
export const PEOPLE: Person[] = ["cengiz", "aysenur"];

export type Exercise = { id: string; name: string; sets: number; reps?: number; secs?: number; rest: number };
export type Program = { title: string; days: number[]; items: Exercise[] };

export const SPORT: Record<Person, Program> = {
  cengiz: {
    title: "Kickboks",
    days: [0, 2, 4, 5],
    items: [
      { id: "ip", name: "İp atlama (ısınma)", sets: 3, secs: 180, rest: 60 },
      { id: "golge", name: "Gölge boksu", sets: 3, secs: 180, rest: 60 },
      { id: "torba", name: "Torba: jab · direkt · kroşe", sets: 5, secs: 120, rest: 60 },
      { id: "tekme", name: "Ön ve dairesel tekme", sets: 4, reps: 12, rest: 45 },
      { id: "plank", name: "Plank", sets: 3, secs: 45, rest: 30 },
    ],
  },
  aysenur: {
    title: "Pilates",
    days: [0, 1, 3, 5],
    items: [
      { id: "hundred", name: "Hundred", sets: 1, reps: 100, rest: 30 },
      { id: "rollup", name: "Roll-up", sets: 2, reps: 8, rest: 30 },
      { id: "kopru", name: "Köprü", sets: 3, reps: 12, rest: 30 },
      { id: "yan", name: "Yan yatışta bacak kaldırma", sets: 3, reps: 15, rest: 30 },
      { id: "spine", name: "Spine stretch", sets: 2, reps: 10, rest: 20 },
      { id: "esneme", name: "Esneme", sets: 1, secs: 300, rest: 0 },
    ],
  },
};

export type CareGroup = "sabah" | "aksam" | "dus" | "haftalik" | "gerektiginde";
export const CARE_GROUPS: { id: CareGroup; label: string; daily: boolean }[] = [
  { id: "sabah", label: "Sabah", daily: true },
  { id: "aksam", label: "Akşam", daily: true },
  { id: "dus", label: "Duş", daily: false },
  { id: "haftalik", label: "Haftalık", daily: false },
  { id: "gerektiginde", label: "Gerektiğinde", daily: false },
];
export type CareItem = { id: string; group: CareGroup; label: string; product: string; brand: string; how: string; secs?: number; note?: string };

const OXO_CARE: CareItem[] = [
  { id: "s-foam", group: "sabah", label: "Yüz köpüğü", product: "Facial Cleansing Foam", brand: "OXO", how: "30–60 sn dairesel masaj, sonra durula", secs: 60 },
  { id: "s-serum", group: "sabah", label: "Serum", product: "Longevity Serum", brand: "OXO", how: "1–2 dk emilmesini bekle, durulanmaz", secs: 120 },
  { id: "s-atoderm", group: "sabah", label: "Nemlendirici", product: "Atoderm Cream Ultra", brand: "Bioderma", how: "İnce kat sürüp bırak" },
  { id: "s-paste", group: "sabah", label: "Diş", product: "Whitening Toothpaste", brand: "OXO", how: "2 dk fırçala", secs: 120, note: "Florür içermez; akşam florürlü macun kullan." },
  { id: "a-foam", group: "aksam", label: "Yüz köpüğü", product: "Facial Cleansing Foam", brand: "OXO", how: "30–60 sn dairesel masaj, sonra durula", secs: 60 },
  { id: "a-serum", group: "aksam", label: "Serum", product: "Longevity Serum", brand: "OXO", how: "1–2 dk emilmesini bekle", secs: 120 },
  { id: "a-atoderm", group: "aksam", label: "Nemlendirici", product: "Atoderm Cream Ultra", brand: "Bioderma", how: "İnce kat sürüp bırak" },
  { id: "a-paste", group: "aksam", label: "Diş (florürlü macun)", product: "Florürlü diş macunu", brand: "", how: "2 dk fırçala", secs: 120 },
  { id: "d-shampoo", group: "dus", label: "Şampuan", product: "Regenerating Hair Shampoo", brand: "OXO", how: "2–3 dk masaj, bekle, durula", secs: 180 },
  { id: "d-soap", group: "dus", label: "Sabun", product: "Niaouli Süngerli Sabun", brand: "OXO", how: "1 dk köpürt, durula (yüze değil)", secs: 60 },
  { id: "h-hairserum", group: "haftalik", label: "Saç serumu", product: "Regenerating Hair Serum", brand: "OXO", how: "En az 60 dk beklet, sonra yıka", secs: 3600 },
  { id: "h-mask", group: "haftalik", label: "Maske", product: "HydraShield Face Mask", brand: "OXO", how: "Haftada 2 kez" },
  { id: "g-repair", group: "gerektiginde", label: "Onarıcı krem", product: "Repair Cream", brand: "OXO", how: "Tıraş bölgesi, eller, dirsek, topuk" },
  { id: "g-hametan", group: "gerektiginde", label: "Hametan", product: "Hametan Krem", brand: "", how: "Tahriş olan bölgeye ince kat" },
];

export const CARE: Record<Person, CareItem[]> = {
  cengiz: [...OXO_CARE.slice(0, 4), { id: "s-deo", group: "sabah", label: "Deodorant", product: "Aura Deo Roll-on", brand: "OXO", how: "Kuru koltuk altına, 1–2 dk kurusun", secs: 120 }, ...OXO_CARE.slice(4)],
  aysenur: OXO_CARE.map((i) => (i.id === "s-atoderm" ? { ...i, label: "Güneş kremi", product: "SPF 50 yüz kremi", brand: "", how: "Dışarı çıkmadan 15 dk önce", secs: 900 } : i)),
};

export type Food = { name: string; portion: string; kcal: number; p: number; c: number; f: number };
export type Meal = { id: string; label: string; foods: Food[] };

export const MEALS: Record<Person, Meal[]> = {
  cengiz: [
    { id: "kahvalti", label: "Kahvaltı", foods: [{ name: "Yumurta", portion: "3 adet", kcal: 216, p: 19, c: 1, f: 15 }, { name: "Yulaf", portion: "60 g", kcal: 228, p: 8, c: 40, f: 4 }, { name: "Muz", portion: "1 adet", kcal: 105, p: 1, c: 27, f: 0 }] },
    { id: "ogle", label: "Öğle", foods: [{ name: "Tavuk göğsü", portion: "180 g", kcal: 297, p: 56, c: 0, f: 6 }, { name: "Bulgur pilavı", portion: "150 g", kcal: 230, p: 6, c: 46, f: 3 }, { name: "Salata", portion: "1 kase", kcal: 60, p: 2, c: 8, f: 3 }] },
    { id: "ara", label: "Ara öğün", foods: [{ name: "Yoğurt", portion: "200 g", kcal: 120, p: 10, c: 9, f: 5 }, { name: "Ceviz", portion: "20 g", kcal: 131, p: 3, c: 3, f: 13 }] },
    { id: "aksam", label: "Akşam", foods: [{ name: "Somon", portion: "160 g", kcal: 330, p: 34, c: 0, f: 21 }, { name: "Fırın sebze", portion: "1 tabak", kcal: 140, p: 4, c: 18, f: 6 }] },
  ],
  aysenur: [
    { id: "kahvalti", label: "Kahvaltı", foods: [{ name: "Peynir", portion: "40 g", kcal: 110, p: 7, c: 1, f: 9 }, { name: "Tam buğday ekmek", portion: "2 dilim", kcal: 160, p: 7, c: 28, f: 2 }, { name: "Domates-salatalık", portion: "1 tabak", kcal: 35, p: 2, c: 7, f: 0 }] },
    { id: "ogle", label: "Öğle", foods: [{ name: "Mercimek çorbası", portion: "1 kase", kcal: 180, p: 10, c: 28, f: 3 }, { name: "Izgara köfte", portion: "120 g", kcal: 260, p: 22, c: 4, f: 17 }] },
    { id: "ara", label: "Ara öğün", foods: [{ name: "Elma", portion: "1 adet", kcal: 95, p: 0, c: 25, f: 0 }, { name: "Badem", portion: "15 g", kcal: 87, p: 3, c: 3, f: 8 }] },
    { id: "aksam", label: "Akşam", foods: [{ name: "Zeytinyağlı fasulye", portion: "1 tabak", kcal: 210, p: 8, c: 24, f: 9 }, { name: "Yoğurt", portion: "150 g", kcal: 90, p: 8, c: 7, f: 4 }] },
  ],
};

export const WATER_TARGET = 10; // bardak
