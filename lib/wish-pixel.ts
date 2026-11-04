// Dilek Dolabı ödüllerinin piksel çizimleri: dolap rafındaki büyük simge (16x16) ve odadaki vitrinde küçük hali (5x6).
import { type Ctx, P, disc, line, px, rect } from "./pixel";
import { WISH_CATS, type WishCat } from "./wishes";

/** 16x16 alanın sol üst köşesine çizer */
export function drawWishIcon(c: Ctx, x: number, y: number, cat: WishCat, t = 0) {
  const col = WISH_CATS[cat]?.color ?? "#b56b7a";
  const glint = Math.floor(t * 2) % 6 === 0;
  switch (cat) {
    case "parfum": // camdan şişe, altın kapak, pembe sıvı
      rect(c, x + 6, y + 1, 4, 3, P.gold); rect(c, x + 7, y + 4, 2, 2, P.ink);
      rect(c, x + 3, y + 6, 10, 9, P.ink); rect(c, x + 4, y + 7, 8, 7, "#f4ead2"); rect(c, x + 4, y + 10, 8, 4, col);
      px(c, x + 5, y + 8, "#ffffff"); if (glint) px(c, x + 11, y + 7, "#ffffff");
      break;
    case "makyaj": // ruj: altın gövde, kırmızı uç
      rect(c, x + 5, y + 8, 6, 7, P.ink); rect(c, x + 6, y + 9, 4, 5, P.gold);
      rect(c, x + 6, y + 4, 4, 5, P.ink); rect(c, x + 7, y + 4, 2, 4, col); px(c, x + 9, y + 3, P.ink); px(c, x + 7, y + 3, col);
      px(c, x + 7, y + 10, P.goldLt);
      break;
    case "cilt": // damlalıklı serum
      rect(c, x + 7, y + 1, 2, 4, P.ink); rect(c, x + 6, y + 4, 4, 2, "#3a3346");
      rect(c, x + 4, y + 6, 8, 9, P.ink); rect(c, x + 5, y + 7, 6, 7, col); rect(c, x + 5, y + 10, 6, 2, "#f4ead2"); px(c, x + 6, y + 8, "#ffffff");
      break;
    case "taki": // kolye: zincir ve taş
      line(c, [x + 2, y + 3], [x + 8, y + 11], 1, P.gold); line(c, [x + 14, y + 3], [x + 8, y + 11], 1, P.gold);
      disc(c, x + 8, y + 12, 2, P.ink); disc(c, x + 8, y + 12, 1, "#9fd0e8"); if (glint) px(c, x + 9, y + 11, "#ffffff");
      break;
    case "canta":
      rect(c, x + 5, y + 2, 6, 1, P.ink); rect(c, x + 4, y + 3, 1, 4, P.ink); rect(c, x + 11, y + 3, 1, 4, P.ink);
      rect(c, x + 2, y + 6, 12, 9, P.ink); rect(c, x + 3, y + 7, 10, 7, col); rect(c, x + 7, y + 9, 2, 2, P.gold);
      break;
    case "kiyafet": // elbise
      rect(c, x + 6, y + 1, 4, 4, P.ink); rect(c, x + 7, y + 2, 2, 3, col);
      for (let r = 0; r < 10; r++) { const w = 4 + Math.floor(r / 1.6); rect(c, x + 8 - w / 2 - 1, y + 5 + r, w + 2, 1, P.ink); rect(c, x + 8 - w / 2, y + 5 + r, w, 1, col); }
      rect(c, x + 6, y + 7, 4, 1, P.gold);
      break;
    case "ayakkabi": // topuklu
      rect(c, x + 2, y + 9, 10, 4, P.ink); rect(c, x + 3, y + 10, 8, 2, "#a8454e"); rect(c, x + 11, y + 6, 3, 4, P.ink); rect(c, x + 12, y + 9, 1, 6, P.ink);
      break;
    case "aksesuar": // güneş gözlüğü
      rect(c, x + 1, y + 6, 6, 5, P.ink); rect(c, x + 9, y + 6, 6, 5, P.ink); rect(c, x + 2, y + 7, 4, 3, col); rect(c, x + 10, y + 7, 4, 3, col); rect(c, x + 7, y + 7, 2, 1, P.ink);
      px(c, x + 3, y + 7, "#ffffff");
      break;
    case "klavye":
      rect(c, x + 1, y + 5, 14, 8, P.ink); rect(c, x + 2, y + 6, 12, 6, "#3a3346");
      for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) px(c, x + 3 + k * 2 + (r % 2), y + 7 + r * 2, (k + r + Math.floor(t * 3)) % 7 ? "#c8ccd8" : col);
      break;
    case "mouse":
      rect(c, x + 5, y + 3, 6, 11, P.ink); rect(c, x + 6, y + 4, 4, 9, "#3a3346"); rect(c, x + 7, y + 4, 1, 3, P.ink); px(c, x + 8, y + 9, col); px(c, x + 8, y + 10, col);
      line(c, [x + 8, y + 3], [x + 8, y], 1, P.ink);
      break;
    case "monitor":
      rect(c, x + 1, y + 2, 14, 10, P.ink); rect(c, x + 2, y + 3, 12, 8, "#1e2a3a");
      for (let r = 0; r < 3; r++) rect(c, x + 3, y + 4 + r * 2, 3 + ((r * 3 + Math.floor(t * 2)) % 7), 1, r === 1 ? col : "#7fd1b9");
      rect(c, x + 7, y + 12, 2, 2, P.ink); rect(c, x + 4, y + 14, 8, 1, P.ink);
      break;
    case "kulaklik":
      line(c, [x + 3, y + 9], [x + 3, y + 5], 1, P.ink); line(c, [x + 13, y + 9], [x + 13, y + 5], 1, P.ink);
      rect(c, x + 4, y + 2, 8, 1, P.ink); px(c, x + 3, y + 3, P.ink); px(c, x + 12, y + 3, P.ink);
      rect(c, x + 1, y + 8, 4, 6, P.ink); rect(c, x + 11, y + 8, 4, 6, P.ink); rect(c, x + 2, y + 9, 2, 4, col); rect(c, x + 12, y + 9, 2, 4, col);
      break;
    case "donanim": // güvenlik anahtarı
      rect(c, x + 4, y + 3, 8, 11, P.ink); rect(c, x + 5, y + 4, 6, 9, "#3a3346"); disc(c, x + 8, y + 8, 2, P.gold); px(c, x + 8, y + 8, glint ? "#ffffff" : col);
      rect(c, x + 6, y + 13, 4, 3, "#c8ccd8"); px(c, x + 7, y + 4, "#7a7486");
      break;
    case "kitap":
      rect(c, x + 2, y + 3, 12, 11, P.ink); rect(c, x + 3, y + 4, 10, 9, col); rect(c, x + 3, y + 4, 2, 9, "#5a2430");
      rect(c, x + 7, y + 6, 4, 1, P.gold); rect(c, x + 7, y + 8, 3, 1, P.gold); rect(c, x + 13, y + 5, 1, 8, "#f4ead2");
      break;
    case "ortacag": // kılıç
      line(c, [x + 3, y + 13], [x + 12, y + 2], 2, P.ink); line(c, [x + 4, y + 12], [x + 12, y + 3], 1, "#e8ecf4");
      line(c, [x + 2, y + 10], [x + 6, y + 14], 2, P.gold); rect(c, x + 1, y + 13, 2, 2, "#6b4a35");
      if (glint) px(c, x + 10, y + 5, "#ffffff");
      break;
    case "aydinlatma": { // dövme demir abajur, içinde titrek mum
      const f = Math.floor(t * 8) % 2;
      rect(c, x + 7, y, 2, 2, P.ink); rect(c, x + 4, y + 2, 8, 2, P.ink); rect(c, x + 4, y + 4, 1, 7, P.ink); rect(c, x + 11, y + 4, 1, 7, P.ink);
      rect(c, x + 5, y + 4, 6, 7, "rgba(255,206,120,0.55)"); rect(c, x + 7, y + 7, 2, 4, "#f4ead2"); rect(c, x + 7, y + 5 - f, 2, 2, col); px(c, x + 7, y + 4 - f, P.goldLt);
      rect(c, x + 3, y + 11, 10, 2, P.ink); rect(c, x + 7, y + 13, 2, 2, P.ink); rect(c, x + 5, y + 15, 6, 1, P.ink);
      break;
    }
    case "tablo":
      rect(c, x + 1, y + 2, 14, 12, P.gold); rect(c, x + 2, y + 3, 12, 10, P.ink); rect(c, x + 3, y + 4, 10, 8, "#2f3b6b");
      rect(c, x + 3, y + 9, 10, 3, "#3f6a44"); rect(c, x + 8, y + 5, 2, 4, "#7d7884"); px(c, x + 8, y + 4, "#7d7884"); disc(c, x + 5, y + 6, 1, P.goldLt);
      break;
    case "deneyim": // bilet
      rect(c, x + 1, y + 4, 14, 8, P.ink); rect(c, x + 2, y + 5, 12, 6, col); rect(c, x + 10, y + 5, 1, 6, P.ink);
      rect(c, x + 4, y + 7, 4, 1, "#ffffff"); px(c, x + 12, y + 8, "#ffffff");
      break;
    default: // hediye kutusu
      rect(c, x + 2, y + 6, 12, 9, P.ink); rect(c, x + 3, y + 7, 10, 7, col); rect(c, x + 7, y + 6, 2, 9, P.gold);
      rect(c, x + 2, y + 5, 12, 2, P.gold); px(c, x + 6, y + 3, P.gold); px(c, x + 9, y + 3, P.gold); rect(c, x + 5, y + 4, 2, 1, P.gold); rect(c, x + 9, y + 4, 2, 1, P.gold);
  }
}

/** Vitrin rafı için 5x6 küçük simge (x, y: sol üst) */
export function miniWish(c: Ctx, x: number, y: number, cat: WishCat) {
  const col = WISH_CATS[cat]?.color ?? "#b56b7a";
  switch (cat) {
    case "parfum": case "cilt": rect(c, x + 2, y, 1, 2, P.gold); rect(c, x + 1, y + 2, 3, 4, col); px(c, x + 1, y + 2, "#ffffff"); break;
    case "makyaj": rect(c, x + 2, y, 1, 2, col); rect(c, x + 1, y + 2, 3, 4, P.gold); break;
    case "taki": px(c, x, y + 1, P.gold); px(c, x + 4, y + 1, P.gold); px(c, x + 1, y + 3, P.gold); px(c, x + 3, y + 3, P.gold); rect(c, x + 2, y + 4, 1, 2, "#9fd0e8"); break;
    case "kitap": rect(c, x, y + 1, 4, 5, col); rect(c, x + 4, y + 2, 1, 4, "#f4ead2"); break;
    case "ortacag": line(c, [x, y + 5], [x + 4, y], 1, "#e8ecf4"); px(c, x + 1, y + 3, P.gold); break;
    case "aydinlatma": rect(c, x + 1, y, 3, 1, P.ink); rect(c, x + 1, y + 1, 3, 3, "#f3c87a"); px(c, x + 2, y + 2, "#ffffff"); rect(c, x + 2, y + 4, 1, 2, P.ink); break;
    case "tablo": rect(c, x, y, 5, 5, P.gold); rect(c, x + 1, y + 1, 3, 3, "#2f3b6b"); break;
    case "monitor": rect(c, x, y, 5, 4, "#1e2a3a"); px(c, x + 1, y + 1, "#7fd1b9"); rect(c, x + 2, y + 4, 1, 2, P.ink); break;
    case "klavye": rect(c, x, y + 3, 5, 3, "#3a3346"); px(c, x + 1, y + 4, col); px(c, x + 3, y + 4, "#c8ccd8"); break;
    default: rect(c, x, y + 1, 5, 5, col); rect(c, x + 2, y + 1, 1, 5, P.gold);
  }
}
