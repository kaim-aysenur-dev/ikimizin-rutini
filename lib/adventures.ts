// Düldül'ün küçük maceraları: ilgili alan ilk görününce bir kez kendiliğinden başlar, dokunarak yeniden oynatılır.
// Zamanlar performance.now saniyesi; maceralar küçük çevre hareketi sayılır, kaydırma ana akışı yönetmeye devam eder.
export type AdvKey = "cape" | "chest" | "chestOut" | "yarn" | "meet" | "map" | "book" | "chest2";
export const adv: Record<AdvKey, number> = { cape: -99, chest: -99, chestOut: -99, yarn: -99, meet: -99, map: -99, book: -99, chest2: -99 };
const started = new Set<AdvKey>();

export function autoStart(key: AdvKey, t: number) {
  if (started.has(key)) return;
  started.add(key);
  adv[key] = t;
}
export function replay(key: AdvKey) { adv[key] = performance.now() / 1000; }
// macera başladıktan sonra geçen süre (başlamadıysa çok büyük negatif)
export const since = (key: AdvKey, t: number) => t - adv[key];
