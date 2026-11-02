// gorseller/*.png → public/products/<ad>.webp
// Şeffaf zemin beyaza oturtulur, kenardaki beyaz boşluk kırpılır, 640px kutuya sığdırılır.
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("gorseller");
const OUT = path.resolve("public/products");
const MAX = 640;

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith(".png"));

for (const file of files) {
  const name = path.basename(file, path.extname(file));
  // 1) beyaza oturt (trim'den önce ayrı geçişte, sıralama garanti olsun)
  const flat = await sharp(path.join(SRC, file)).flatten({ background: "#ffffff" }).png().toBuffer();
  // 2) beyaz/açık gri kenarları kırp, sığdır, webp
  const out = path.join(OUT, `${name}.webp`);
  const info = await sharp(flat)
    .trim({ background: "#ffffff", threshold: 28 })
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);
  console.log(`${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
