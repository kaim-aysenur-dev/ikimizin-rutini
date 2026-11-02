// public/icons altındaki uygulama ikonlarını üretir (PWA, favicon, iOS ana ekran).
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#14675f";
const INK = "#ffffff";

// İç içe iki halka: "ikimiz"
function mark({ size, radius, scale = 1 }) {
  const c = size / 2;
  const r = (size * 0.2) * scale;
  const dx = r * 0.78;
  const w = size * 0.066 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <circle cx="${c - dx}" cy="${c}" r="${r}" fill="none" stroke="${INK}" stroke-width="${w}"/>
  <circle cx="${c + dx}" cy="${c}" r="${r}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-opacity="0.8"/>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const outputs = [
  ["icon-192.png", 192, mark({ size: 192, radius: 42 })],
  ["icon-512.png", 512, mark({ size: 512, radius: 112 })],
  // maskable: tam dolu zemin, işaret güvenli alanın (%80) içinde
  ["icon-maskable-512.png", 512, mark({ size: 512, radius: 0, scale: 0.8 })],
  ["apple-touch-icon.png", 180, mark({ size: 180, radius: 0, scale: 0.9 })],
];

for (const [file, , svg] of outputs) {
  await sharp(Buffer.from(svg)).png().toFile(`public/icons/${file}`);
  console.log(file);
}

await writeFile("public/icons/icon.svg", mark({ size: 64, radius: 14 }));
console.log("icon.svg");

