// Ay Kapısı bölümleri: VERİ. Yeni bölüm eklemek için bu listeye bir nesne eklemek yeter:
//  - map: satırlar (j) ve sütunlar (i) karakterle çizilir; lejant aşağıda. Kenarlar duvarla çevrilidir, haritaya yazılmaz.
//  - theme: dungeon-themes.ts'teki görünüm (zemin, duvar, ışık, parçacık, süs renkleri)
//  - waves: her dalga [yaratık türü, adet]; son dalgada champion (bölüm şefi) ayrıca doğar
//  - level: girmek için gereken seviye; power: önerilen ekipman gücü; xp: ilk geçiş ödülü
// Harita lejantı (dungeon-map.ts aynı tabloyu okur):
//   .  zemin          S  oyuncunun girişi     E  çıkış portalı      m  yaratık doğma yeri    B  şefin/bossun yeri
//   #  taş blok       o  sütun                R  kaya               T  ağaç                  g  mezar/tabut
//   x  sandık/fıçı    f  mangal (ışık)        c  kristal (ışık)     n  çadır                 h  kitaplık
//   u  dev mantar     e  örümcek yumurtası    $  altın yığını       Y  taht                  k  hazine sandığı
//   ~  uçurum/su      =  köprü (yürünür)      L  lav (yakar)        p  zehir/kan gölü (yakar) w  örümcek ağı (yavaşlatır)
//   r  rün (süs)      i  buz (süs)            t  meşale direği
import { type EnemyKind } from "./dungeon-enemies";
import { type ThemeId } from "./dungeon-themes";
import { type GenSpec, generate } from "./dungeon-gen";

export type Stage = {
  id: number; name: string; emoji: string; theme: ThemeId; level: number; power: number; xp: number;
  story: string; // giriş kartında
  tip: string; // ipucu: tehlike, taktik
  waves: [EnemyKind, number][][];
  champion: { kind: EnemyKind; name: string }; // son dalganın şefi (güçlü, iri, altın halkalı)
  title: string; // bölümü geçene açılan unvan
  big?: boolean; // büyük tünel bölümü (her dört bölümde bir): odalar, geçitler, beş dalga
  map: string[];
};

// elle çizilmiş bölümler (sıra ve seviye aşağıda ORDER ile verilir; buradaki id, level, power, xp yer tutucu)
const HANDMADE: Stage[] = [
  {
    id: 1, name: "Goblin Mağarası", emoji: "🕳️", theme: "magara", level: 1, power: 20, xp: 50, title: "Goblin Avcısı",
    story: "Ay Kapısı'nın ardındaki ilk mağara. Karanlıkta parlayan sarı gözler, metal tıkırtıları... Goblinler hazinelerini sana kaptırmak istemiyor.",
    tip: "Goblinler zayıf ama kalabalık gelir; sırtını duvara ver ve kombo vur.",
    waves: [[["goblin", 3]], [["goblin", 3], ["kurt", 1]], [["goblin", 3]]],
    champion: { kind: "goblin", name: "Goblin Şefi Gırtlak" },
    map: [
      "R.......R.......R......R",
      "........................",
      "...R.....RR.........m...",
      "..........R.............",
      "....t..........R....m...",
      "...................c....",
      "..R..........m..........",
      "S...........RR........E.",
      "........................",
      "....R.........m.....R...",
      "..........t.............",
      "..RR..............R..m..",
      "........m......B........",
      ".....c..................",
      ".....R.........R....m...",
      "R..........R...........R",
    ],
  },
  {
    id: 2, name: "Kurt Ormanı", emoji: "🐺", theme: "orman", level: 4, power: 45, xp: 70, title: "Kurt Sürüsünün Korkusu",
    story: "Sisli çam ormanında dolunay altında uluyan sürüler. Ağaçların arasından gümüş gözler seni izliyor.",
    tip: "Kurtlar hızlıdır; ağaçların arasında dar geçitlere çekip tek tek vur.",
    waves: [[["kurt", 3]], [["kurt", 2], ["goblin", 2]], [["kurt", 3]]],
    champion: { kind: "kurt", name: "Gümüş Yele" },
    map: [
      "T..T....T.....T....T...T",
      "..T...T.....T.....T...m.",
      "T.......T..........T....",
      "...T........T...T.....m.",
      ".T....T...........T.....",
      "........T....T.......T..",
      "..T............m........",
      "S.......T...........m.E.",
      "....T.......T...........",
      ".T......B.......T....T..",
      "......T.....T......m....",
      "..T..........T..........",
      "T.....T...T......T....T.",
      "...T..........m.....T...",
      ".T....T....T.......T....",
      "T...T.....T....T.....T.T",
    ],
  },
  {
    id: 3, name: "Mantar Bataklığı", emoji: "🍄", theme: "bataklik", level: 7, power: 75, xp: 90, title: "Bataklık Gezgini",
    story: "Dev mantarların fosforlu ışığında kaynayan zehirli bir bataklık. Sporlar havada süzülüyor, örümcekler çamurda bekliyor.",
    tip: "Yeşil gölcükler zehirler: üstünde durma. Mantar adamlar uzaktan spor atar.",
    waves: [[["mantar", 2], ["orumcek", 1]], [["orumcek", 3]], [["mantar", 3], ["orumcek", 1]]],
    champion: { kind: "mantar", name: "Çürük Kral Sporan" },
    map: [
      "u....pp.....u.....pp...u",
      "....ppp..........ppp..m.",
      "..u.........u...........",
      "........pp.........u....",
      "...pp...pp....u.....m...",
      "..............pp........",
      ".u......u.....ppp.......",
      "S..............p......E.",
      "......pp...u............",
      "..u...pp.........u..m...",
      ".........B..pp..........",
      "....u.......pp.....pp...",
      "..pp........u......pp...",
      "..pp...u.........m......",
      "u............pp.....u...",
      "...u....u....pp.....m..u",
    ],
  },
  {
    id: 4, name: "Örümcek Yuvası", emoji: "🕷️", theme: "yuva", level: 10, power: 105, xp: 110, title: "Ağ Kıran",
    story: "Duvarlardan sarkan ağlar, tavanda kıpırdayan gölgeler. Örümcek Kraliçesi yumurtalarını korumak için her yerde.",
    tip: "Ağlar seni yavaşlatır; yumurtaların çevresinden dolaş.",
    waves: [[["orumcek", 3]], [["orumcek", 3], ["yarasa", 2]], [["orumcek", 4]]],
    champion: { kind: "orumcek", name: "Kraliçe Arakna" },
    map: [
      "R..ww.....e......ww...eR",
      "...www..........www..m..",
      ".e........R.............",
      ".....ww.......ww....e...",
      "..R..ww..e....ww....m...",
      "........................",
      "..ww..........R....ww...",
      "S.ww......e........ww.E.",
      "........ww..............",
      "..e.....ww..B......e.m..",
      ".............ww.........",
      "...R.........ww.....R...",
      ".ww.....e...........ww..",
      ".ww...........m.....ww..",
      "....e.....ww.......e....",
      "R.........ww......m....R",
    ],
  },
  {
    id: 5, name: "İskelet Mezarı", emoji: "💀", theme: "mezar", level: 13, power: 140, xp: 130, title: "Mezar Bekçisi",
    story: "Unutulmuş kralların mezarlığı. Mezar taşları çatırdıyor, sisin içinden kemik tıkırtıları yükseliyor.",
    tip: "İskeletler yavaş ama dayanıklı; hayaletler duvardan geçer, sırtını kolla.",
    waves: [[["iskelet", 3]], [["iskelet", 2], ["hayalet", 2]], [["iskelet", 3], ["hayalet", 1]]],
    champion: { kind: "iskelet", name: "Kemik Lord Morhal" },
    map: [
      "g.g.g......o.....g.g.g.g",
      "........................",
      "g.g.g.....t.......g.g.m.",
      "........................",
      "...o......g.g......o....",
      "..............m.........",
      "g.g...........g.g....m..",
      "S......o..............E.",
      "g.g...........g.g.......",
      "..........B.............",
      "...o......g.g......o.m..",
      "........................",
      "g.g.g.....t.......g.g...",
      ".............m..........",
      "g.g.g......o.....g.g.g..",
      "...................m....",
    ],
  },
  {
    id: 6, name: "Yarasa Kuyusu", emoji: "🦇", theme: "kuyu", level: 16, power: 175, xp: 150, title: "Gece Kanadı",
    story: "Dipsiz bir kuyunun çevresinde kristallerle aydınlanan mağara. Tavandan çığlıklarla yarasa sürüleri iniyor.",
    tip: "Ortadaki uçuruma düşülmez ama yarasalar üstünden uçar; köşelerde savaş.",
    waves: [[["yarasa", 4]], [["yarasa", 3], ["iskelet", 2]], [["yarasa", 4], ["goblin", 2]]],
    champion: { kind: "yarasa", name: "Kan Kanat" },
    map: [
      "c.......R.......R......c",
      "......................m.",
      "...R.....~~~~~~.........",
      "........~~~~~~~~....m...",
      ".......~~~~~~~~~~.......",
      "..c....~~~~~~~~~~...R...",
      "........~~~~~~~~........",
      "S.........~~~~........E.",
      "........................",
      "..R..........B......m...",
      "........c...............",
      "...m...........R........",
      "..........R.........c...",
      ".....c..............m...",
      "...R.........m..........",
      "c........R.............c",
    ],
  },
  {
    id: 7, name: "Ork Kampı", emoji: "🪓", theme: "kamp", level: 19, power: 210, xp: 180, title: "Ork Yenen",
    story: "Davullar gümbürdüyor, mangallarda et cızırdıyor. Ork savaş beyi kabilesini toplamış, saldırıya hazırlanıyor.",
    tip: "Orklar ağır vurur; çadırların arkasına saklanıp birer birer çek.",
    waves: [[["ork", 2], ["goblin", 2]], [["ork", 3]], [["ork", 2], ["goblin", 3]]],
    champion: { kind: "ork", name: "Savaş Beyi Gromak" },
    map: [
      "x.x....n......n....x.x.x",
      ".......................m",
      "..f.......n.......f.....",
      "......x.......x.......m.",
      ".n...........f......n...",
      "........xx..............",
      "...f............x.......",
      "S.........B...........E.",
      "...f............x.......",
      "........xx..........m...",
      ".n...........f......n...",
      "......x.......x.........",
      "..f.......n.......f..m..",
      "........................",
      "x.x....n......n....x.x..",
      "....m...........m.......",
    ],
  },
  {
    id: 8, name: "Büyücü Kulesi", emoji: "🧙", theme: "kule", level: 24, power: 265, xp: 220, title: "Büyü Bozucu",
    story: "Yasak büyülerin yazıldığı kule. Rünler yerde nabız gibi atıyor; kara büyücüler kitaplıkların ardından ateş yağdırıyor.",
    tip: "Büyücülerin mermilerinden yana kayarak kaç; sütunlar kalkan olur.",
    waves: [[["buyucu", 2], ["iskelet", 2]], [["buyucu", 3], ["ork", 1]], [["buyucu", 3], ["iskelet", 2]]],
    champion: { kind: "buyucu", name: "Kara Büyücü Velthar" },
    map: [
      "hhhh....o.......o...hhhh",
      "......................m.",
      "..o....r.r.r.r.r....o...",
      "......r.........r.......",
      ".....r...o...o...r..m...",
      "....r.............r.....",
      "...r.......B.......r....",
      "S..r...............r..E.",
      "...r...............r....",
      "....r.............r..m..",
      ".....r...o...o...r......",
      "......r.........r.......",
      "..o....r.r.r.r.r....o...",
      "...............m........",
      "hhhh....o.......o...hhhh",
      "......m.........m.......",
    ],
  },
  {
    id: 9, name: "Buz Mağarası", emoji: "❄️", theme: "buz", level: 29, power: 320, xp: 260, title: "Buz Yürekli",
    story: "Kuzeyin donmuş kalbi. Mavi buz kristalleri arasında buz elementalleri uyanıyor; nefesin bile donuyor.",
    tip: "Buz elementalleri uzaktan kristal atar; kristal kümelerini siper al.",
    waves: [[["buz", 2], ["kurt", 2]], [["buz", 3]], [["buz", 3], ["kurt", 2]]],
    champion: { kind: "buz", name: "Kış Muhafızı Frosk" },
    map: [
      "c..i....R....i....c...ic",
      "..i..........i........m.",
      "......c....iii....c.....",
      "...ii.......i.........m.",
      "..........R......ii.....",
      ".c....ii.........ii..c..",
      "......ii....c...........",
      "S.......i..........i..E.",
      "........i....B.....i....",
      "..R.........c........m..",
      "......c.........R.......",
      "...ii.........ii........",
      "...ii..c......ii...c....",
      "..........i.........m...",
      ".c..R....iii....R....c..",
      "c.........i...........ic",
    ],
  },
  {
    id: 10, name: "Trol Köprüsü", emoji: "🌉", theme: "kopru", level: 34, power: 380, xp: 300, title: "Köprü Fatihi",
    story: "Uçurumun üstünde sallanan taş köprü. Köprünün bekçisi trol geçen herkesten bir bedel istiyor: canını.",
    tip: "Köprü dardır; trolün sopası geniş vurur, vurduktan sonra arkasına geç.",
    waves: [[["ork", 3]], [["trol", 1], ["goblin", 3]], [["trol", 1], ["ork", 2]]],
    champion: { kind: "trol", name: "Köprü Bekçisi Grumm" },
    map: [
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "o..o...o...o...o...o..m~",
      "=======================~",
      "==================m=====",
      "S========B===========mE.",
      "==============m=========",
      "=======================~",
      "o..o...o...o...o...om.o~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
  },
  {
    id: 11, name: "Golem Ocağı", emoji: "🗿", theme: "ocak", level: 40, power: 450, xp: 350, title: "Ocak Ustası",
    story: "Dağın içindeki eski cüce ocağı. Lav kanallarının ısısıyla dövülmüş taş golemler hâlâ nöbette.",
    tip: "Lav kanalları yakar; köprülerden geç. Golemler yavaştır ama çok dayanıklıdır.",
    waves: [[["golem", 1], ["goblin", 3]], [["golem", 2], ["seytan", 1]], [["golem", 2], ["ork", 2]]],
    champion: { kind: "golem", name: "Ocak Golemi Mağmor" },
    map: [
      "x....LL......LL......x.x",
      ".....LL......LL.......m.",
      "..f..LL..R...LL...f.....",
      ".....==......==.......m.",
      ".....LL......LL.........",
      "..R..LL..x...LL..R......",
      ".....LL......LL.........",
      "S....==......==.......E.",
      ".....LL......LL.........",
      "..x..LL..B...LL..x..m...",
      ".....LL......LL.........",
      ".....==......==.........",
      "..f..LL..R...LL...f..m..",
      ".....LL......LL.........",
      "x....LL......LL......x..",
      ".....LL....m.LL.........",
    ],
  },
  {
    id: 12, name: "Kara Şövalyeler Kalesi", emoji: "🛡️", theme: "kale", level: 46, power: 520, xp: 400, title: "Kara Yemin Kıran",
    story: "Yeminli kara şövalyelerin kalesi. Koridorlarda zırh şıngırtısı yankılanıyor; kızıl gözlü miğferler seni bekliyor.",
    tip: "Koridorlar dar: şövalyeleri tek sıra hâlinde karşıla, büyücüleri önce indir.",
    waves: [[["kara-sovalye", 2]], [["kara-sovalye", 2], ["buyucu", 2]], [["kara-sovalye", 3]]],
    champion: { kind: "kara-sovalye", name: "Kara Komutan Valdris" },
    map: [
      "###.......o..o.......###",
      "###.................m###",
      "......####....####......",
      "......#..........#....m.",
      "..o...#..f....f..#...o..",
      "......#..........#......",
      "......###......###......",
      "S.........B...........E.",
      "......###......###......",
      "......#..........#...m..",
      "..o...#..f....f..#...o..",
      "......#..........#......",
      "......####....####......",
      "###.................m###",
      "###.......o..o.......###",
      "........................",
    ],
  },
  {
    id: 13, name: "Şeytan Çukuru", emoji: "😈", theme: "cukur", level: 53, power: 600, xp: 460, title: "Alevlerin Efendisi",
    story: "Yeryüzünün yarığından fışkıran lav ve kükürt. Boynuzlu şeytanlar ateşin içinden kanat çırparak yükseliyor.",
    tip: "Lavın üstünden geçme! Şeytanlar uzaktan ateş topu atar, kayaların arkasında dur.",
    waves: [[["seytan", 2], ["iskelet", 2]], [["seytan", 3], ["golem", 1]], [["seytan", 3], ["kara-sovalye", 1]]],
    champion: { kind: "seytan", name: "Alevli Baal" },
    map: [
      "LLL....R.......R....LLLL",
      "LL...................mLL",
      "L.......LLLL.......R...L",
      "....R..LLLLLL...........",
      "........LLLL.........m..",
      "..LL............LL......",
      "..LL.....R......LL..R...",
      "S.........B...........E.",
      "...R.....LL.............",
      "........LLLL....R....m..",
      ".......LLLLLL...........",
      "L.......LLLL.......LL..L",
      "LL...R.............LL.LL",
      "LLL..........m........LL",
      "LLLL.....R.......R...LLL",
      "LLLLL.....m........LLLLL",
    ],
  },
  {
    id: 14, name: "Lich'in Mahzeni", emoji: "👑", theme: "mahzen", level: 60, power: 690, xp: 530, title: "Ölümsüzü Deviren",
    story: "Ölümsüz büyücü Lich, binlerce yıllık tahtında oturuyor. Tabutlar açılıyor, ruhlar etrafında dönüyor.",
    tip: "Lich uzaktan ruh ateşi yağdırır; sütundan sütuna koşarak yaklaş.",
    waves: [[["iskelet", 4], ["hayalet", 2]], [["buyucu", 3], ["kara-sovalye", 2]], [["lich", 1], ["iskelet", 3]]],
    champion: { kind: "hayalet", name: "Ağlayan Gelin" },
    map: [
      "g.g.g...o..Y..o...g.g.g.",
      "...........B............",
      "g.g.g...o.....o...g.g.m.",
      "........................",
      "...o..r.r.r.r.r.r..o....",
      "......................m.",
      "g.g.....o.....o.....g.g.",
      "S.....................E.",
      "g.g.....o.....o.....g.g.",
      "....................m...",
      "...o..r.r.r.r.r.r..o....",
      "........................",
      "g.g.g...o.....o...g.g.g.",
      "..............m.........",
      "g.g.g...o.....o...g.g.g.",
      "........m...............",
    ],
  },
  {
    id: 15, name: "Ejderha Yuvası", emoji: "🐉", theme: "ejder", level: 70, power: 800, xp: 650, title: "Ejderha Avcısı",
    story: "Dağın tepesinde altın yığınları ve kemikler. Kızıl ejderha uyandı; kanatlarının gölgesi tüm mağarayı kaplıyor.",
    tip: "Ejderhanın alevi önüne doğru yayılır; yanlarından ve arkasından vur.",
    waves: [[["seytan", 3], ["ork", 2]], [["trol", 2], ["kara-sovalye", 2]], [["ejderha", 1], ["seytan", 2]]],
    champion: { kind: "golem", name: "Altın Bekçi" },
    map: [
      "$$.....R......R.....$$$$",
      "$..........$..........m$",
      "....R...........R.......",
      "..........$$$...........",
      ".$......$$$$$$$.......m.",
      "......$$$$$$$$$$........",
      "..R....$$$$$$$$......R..",
      "S.........B...........E.",
      "........................",
      "..R...........R.....m...",
      ".$.......$$.............",
      ".........$$.........$...",
      "....R..........R........",
      "$...........m..........$",
      "$$.....R.........R....$$",
      "$$$$.....m.........$$$$$",
    ],
  },
  {
    id: 16, name: "Kan Ayı", emoji: "🌕", theme: "kanay", level: 82, power: 920, xp: 800, title: "Kan Ayı'nı Gören",
    story: "Ay kan kırmızısına döndü. Kan Lordu, ordusunu Ay Kapısı'ndan geçirmek için uyandı. Bu son savaş: ikiniz için.",
    tip: "Kan gölleri canını emer. Kan Lordu hızlıdır ve uzaktan vurur; büyülerini sakla.",
    waves: [[["kara-sovalye", 3], ["seytan", 2]], [["lich", 1], ["hayalet", 4]], [["kan-lordu", 1], ["kurt", 3]]],
    champion: { kind: "seytan", name: "Kızıl Kanat" },
    map: [
      "T....pp.....f.....pp...T",
      "....ppp..........ppp..m.",
      "..T........o.o..........",
      "........pp.........T....",
      "...pp...pp...f......m...",
      ".f............pp........",
      ".....T........ppp...T...",
      "S..........B..........E.",
      "......pp................",
      "..T...pp.....f......m...",
      "............pp......f...",
      ".f..T.......pp.....pp...",
      "..pp...............pp...",
      "..pp...T....o.o..m......",
      "T............pp.....T...",
      "...f....f....pp.....m..T",
    ],
  },
];

/* --------------------------- üretilmiş bölümler --------------------------- */

// temanın haritasında serpiştirilen süsler ve tehlikeler (dungeon-gen.ts)
const GEN: Record<ThemeId, Omit<GenSpec, "kind" | "seed">> = {
  magara: { props: "RRRc" }, orman: { props: "TTTR" }, bataklik: { props: "uuT", hazard: "p" }, yuva: { props: "Re", hazard: "w", hazardRate: 0.1 },
  mezar: { props: "ggo" }, kuyu: { props: "Rc", hazard: "~", hazardRate: 0.05 }, kamp: { props: "xnf" }, kule: { props: "oh", decor: "r" },
  buz: { props: "Rc", decor: "i" }, kopru: { props: "o", hazard: "~", hazardRate: 0.06 }, ocak: { props: "Rxf", hazard: "L" }, kale: { props: "o#f" },
  cukur: { props: "R", hazard: "L", hazardRate: 0.1 }, mahzen: { props: "gof" }, ejder: { props: "$R" }, kanay: { props: "Tf", hazard: "p" },
  col: { props: "RRx", hazard: "~", hazardRate: 0.04 }, piramit: { props: "og$", decor: "r" }, deniz: { props: "Rc", hazard: "~", hazardRate: 0.07 },
  kristal: { props: "ccR" }, gotik: { props: "ogf" }, kapadokya: { props: "RRx" }, bulut: { props: "oc", hazard: "~", hazardRate: 0.06 }, cehennem: { props: "Rf", hazard: "L", hazardRate: 0.09 },
};
type Draft = { name: string; emoji: string; theme: ThemeId; story: string; tip: string; foes: EnemyKind[]; champion: { kind: EnemyKind; name: string }; title: string; boss?: EnemyKind[] };
const ph = 0;
const draft = (d: Draft): Stage => ({ id: ph, level: ph, power: ph, xp: ph, waves: [], map: [], ...d });

// yeni normal bölümler: efsaneler, masallar ve destanlardan esinlenmiş
const NEW: Record<string, Draft> = {
  kurtadam: { name: "Kurt Adam Köyü", emoji: "🌕", theme: "orman", story: "Dolunay doğunca köyün kapıları kilitlenir. Ormandan gelen uluma, insan sesine benziyor...", tip: "Kurt adamlar çok hızlıdır; yuvarlanarak (Shift) saldırılarından kaç.", foes: ["kurtadam", "kurt", "kurt"], champion: { kind: "kurtadam", name: "Dolunay Uluyanı" }, title: "Gümüş Kurşun" },
  akrep: { name: "Çöl Akrepleri", emoji: "🦂", theme: "col", story: "Kızgın kumların altında dev akrepler bekliyor. Rüzgâr kumu kaldırınca iğneleri parlıyor.", tip: "Akrepler kalabalık gelir; sırtını kayaya ver.", foes: ["akrep", "mumya", "akrep"], champion: { kind: "akrep", name: "Zehirli Kuyruk" }, title: "Kum Gezgini" },
  harpi: { name: "Harpi Kayalıkları", emoji: "🪶", theme: "kapadokya", story: "Peri bacalarının tepesinde harpiler yuva kurmuş. Çığlıkları vadide yankılanıyor.", tip: "Harpiler uçar ve yukarıdan dalar; kayaların dibinde dur.", foes: ["harpi", "goblin", "harpi"], champion: { kind: "harpi", name: "Fırtına Pençe" }, title: "Gök Avcısı" },
  batik: { name: "Batık Tapınak", emoji: "🌊", theme: "deniz", story: "Denizin altına gömülmüş bir tapınak. Boğulmuş denizciler hâlâ nöbette.", tip: "Mavi sular geçilmez; adacıklar arasındaki yolları izle.", foes: ["iskelet", "golge", "hayalet"], champion: { kind: "golge", name: "Boğulmuş Kaptan" }, title: "Dalgaların Efendisi" },
  kristal: { name: "Kristal Mağaralar", emoji: "💎", theme: "kristal", story: "Mor kristallerin ışığında yankılanan sessizlik. Taş golemler kristalleri koruyor.", tip: "Golemler yavaştır; etrafında dön ve arkasından vur.", foes: ["golem", "buz", "yarasa"], champion: { kind: "golem", name: "Kristal Muhafız" }, title: "Işık Kıran" },
  kont: { name: "Kontun Gotik Şatosu", emoji: "🦇", theme: "gotik", story: "Dağın tepesindeki şatoda mumlar hiç sönmez. Kont misafirlerini akşam yemeğine bekliyor.", tip: "Vampirler uzaktan kan büyüsü atar; yarasalara dikkat.", foes: ["vampir", "yarasa", "golge"], champion: { kind: "vampir", name: "Kont Morvay" }, title: "Gece Avcısı" },
  gorgon: { name: "Gorgon'un Bahçesi", emoji: "🐍", theme: "piramit", story: "Bahçe taş heykellerle dolu; hepsi bir zamanlar kahramandı. Yılan saçlı Gorgon bekliyor.", tip: "Gorgon'un bakışı uzaktan vurur; sütunların arkasından ilerle.", foes: ["medusa", "akrep", "iskelet"], champion: { kind: "medusa", name: "Taş Bakışlı" }, title: "Aynalı Kalkan" },
  karaelf: { name: "Kara Elf Ormanı", emoji: "🏹", theme: "orman", story: "Ağaçların arasında görünmez okçular. Kara elfler ormanlarına girenleri affetmez.", tip: "Okçular uzaktan vurur; zikzak çizerek yaklaş.", foes: ["kara-elf", "kurt", "orumcek"], champion: { kind: "kara-elf", name: "Gölge Okçu Nyx" }, title: "Ok Kesen" },
  albasti: { name: "Albastı Bataklığı", emoji: "🌫️", theme: "bataklik", story: "Gece yarısı bataklıkta bir kadın şarkı söylüyor. Yaklaşanlar bir daha dönmüyor.", tip: "Albastılar uçar ve büyü atar; zehirli sulara girme.", foes: ["alkarisi", "mantar", "hayalet"], champion: { kind: "alkarisi", name: "Bataklık Cadısı" }, title: "Cadı Avcısı" },
  karakoncolos: { name: "Karakoncolos Geçidi", emoji: "❄️", theme: "buz", story: "Zemheride dağ geçidinde biri kapı çalar. Karakoncolos soruyu yanlış bilene acımaz.", tip: "Karakoncolos güçlü vurur; vurduktan sonraki boşlukta saldır.", foes: ["karakoncolos", "kurt", "buz"], champion: { kind: "karakoncolos", name: "Zemheri" }, title: "Kış Yolcusu" },
  kopek: { name: "Cehennem Köpekleri", emoji: "🔥", theme: "cehennem", story: "Lav nehrinin kıyısında alevli köpekler sürü hâlinde avlanıyor.", tip: "Lav yakar; köpekler çok hızlı, büyüyle alan temizle.", foes: ["cehennem-kopegi", "seytan", "cehennem-kopegi"], champion: { kind: "cehennem-kopegi", name: "Üç Başlı Bekçi" }, title: "Ateş Tasması" },
  minotor: { name: "Minotor Labirenti", emoji: "🐂", theme: "kale", story: "Taş koridorların sonunda bir böğürtü. Labirentin boğa başlı bekçisi seni kokladı.", tip: "Minotor ağır vurur; koridorda yan yana gelme, yuvarlanarak kaç.", foes: ["minotor", "iskelet", "kara-sovalye"], champion: { kind: "minotor", name: "Labirentin Boğası" }, title: "Labirent Çözücü" },
  agac: { name: "Ağaç Adamlar Korusu", emoji: "🌳", theme: "orman", story: "Kadim koruda ağaçlar konuşuyor ve yürüyor. Baltayla girenleri ezmeye kararlılar.", tip: "Ağaç adamlar çok dayanıklıdır; ateş büyüsü iyi gelir.", foes: ["agac-adam", "orumcek", "kurt"], champion: { kind: "agac-adam", name: "Kadim Meşe" }, title: "Ormanın Dostu" },
  mumya: { name: "Mumya Mahzeni", emoji: "🏺", theme: "piramit", story: "Bin yıllık sargılar çözülüyor. Lanetli mahzenin firavunu uyandı.", tip: "Mumyalar yavaş ama dayanıklı; akreplerden önce kurtul.", foes: ["mumya", "akrep", "golge"], champion: { kind: "mumya", name: "Firavun Neferet" }, title: "Lanet Bozucu" },
  golge: { name: "Gölgeler Diyarı", emoji: "🌑", theme: "mahzen", story: "Işığın hiç girmediği diyar. Ruh çalan gölgeler sıcaklığına doğru süzülüyor.", tip: "Gölgeler duvardan geçer; sırtını açık bırakma.", foes: ["golge", "hayalet", "iskelet"], champion: { kind: "golge", name: "Ruh Çalan" }, title: "Ruhunu Koruyan" },
  dev: { name: "Buz Devleri Diyarı", emoji: "🏔️", theme: "buz", story: "Buzulların arasında dağ kadar devler. Adımları yeri titretiyor.", tip: "Devler yavaş ama çok sert vurur; menzilli saldırıyla yıprat.", foes: ["buz-devi", "buz", "karakoncolos"], champion: { kind: "buz-devi", name: "Donmuş Taç" }, title: "Devleri Deviren" },
  yeralti: { name: "Yeraltı Şehri", emoji: "🏜️", theme: "kapadokya", story: "Kayaların içine oyulmuş katlarca şehir. Eski muhafızlar hâlâ kapıları tutuyor.", tip: "Dar odalar; okçuları ve golemleri ayır.", foes: ["kara-elf", "golem", "goblin"], champion: { kind: "golem", name: "Taş Muhafız" }, title: "Yeraltı Kâşifi" },
  bulut: { name: "Bulut Kalesi", emoji: "☁️", theme: "bulut", story: "Gökyüzünde süzülen mermer bir kale. Harpiler ve buz ruhları burayı yuva yapmış.", tip: "Mavi boşluklar gökyüzüdür, düşülmez ama geçilmez.", foes: ["harpi", "buz", "alkarisi"], champion: { kind: "harpi", name: "Gök Kraliçesi" }, title: "Bulutların Üstünde" },
  gelin: { name: "Vampir Gelinleri", emoji: "🥀", theme: "gotik", story: "Balo salonunda müzik hiç durmuyor. Kızıl gelinlikli dansçılar konuklarını bekliyor.", tip: "Vampirler kan büyüsü atar; gölgeler arkadan gelir.", foes: ["vampir", "golge", "yarasa"], champion: { kind: "vampir", name: "Kızıl Gelin" }, title: "Şafağın Işığı" },
  kapi: { name: "Cehennem Kapısı", emoji: "🚪", theme: "cehennem", story: "Dünyalar arasındaki kapı aralandı. Bekçisi kimseyi geri göndermiyor.", tip: "Lav her yerde; şeytanların ateş toplarından yana kay.", foes: ["seytan", "cehennem-kopegi", "golem"], champion: { kind: "seytan", name: "Kapı Bekçisi Azgal" }, title: "Kapıyı Kapatan" },
  elmas: { name: "Elmas İni", emoji: "💠", theme: "kristal", story: "Kristallerin en derininde elmastan bir yürek atıyor. Bekçileri ışık kadar parlak.", tip: "Elmas golem çok sağlamdır; İki Kalp Patlaması'nı sakla.", foes: ["golem", "buz", "kara-elf"], champion: { kind: "golem", name: "Elmas Golem" }, title: "Elmas Yürekli" },
  yildiz: { name: "Yıldızların Kıyısı", emoji: "✨", theme: "bulut", story: "Gökyüzünün bittiği yerde yıldızlar yere iniyor. Burada gölgeler de ışık gibi parlıyor.", tip: "Son büyük savaştan önce son durak; her şeyini kullan.", foes: ["golge", "kara-elf", "alkarisi"], champion: { kind: "kara-elf", name: "Yıldız Okçusu" }, title: "Yıldıza Dokunan" },
};

// büyük tüneller: her dört bölümde bir; odalar, geçitler ve sonda büyük bir boss
const TUNNELS: Draft[] = [
  { name: "Cüce Madenleri", emoji: "⛏️", theme: "magara", story: "Terk edilmiş cüce madenleri dağın içinde kilometrelerce uzanıyor. Karanlıkta bir şeyler kazıyor...", tip: "Tüneller uzun: odadan odaya ilerle, canın azalınca geri çekil.", foes: ["goblin", "orumcek", "yarasa"], champion: { kind: "goblin", name: "Maden Kralı Dırdır" }, title: "Madenlerin Fatihi", boss: ["trol"] },
  { name: "Örümcek Tünelleri", emoji: "🕸️", theme: "yuva", story: "Ağlarla kaplı dolambaçlı tüneller. Her köşede sekiz göz parlıyor.", tip: "Ağlar yavaşlatır; geçitlerde savaşma, odalarda savaş.", foes: ["orumcek", "yarasa", "mantar"], champion: { kind: "orumcek", name: "Ana Örümcek Vesh" }, title: "Ağların Efendisi", boss: ["orumcek"] },
  { name: "Tepegöz'ün Mağarası", emoji: "👁️", theme: "magara", story: "Dede Korkut'un anlattığı dev: tek gözlü Tepegöz. Mağarasına giren çoban bir daha dönmedi.", tip: "Tepegöz'ün sopası çok sert; tek gözünü hedef al, arkasında kal.", foes: ["goblin", "ork", "kurt"], champion: { kind: "ork", name: "Tepegöz'ün Çobanı" }, title: "Tepegöz'ü Deviren", boss: ["tepegoz"] },
  { name: "Şahmeran'ın Yeraltı Sarayı", emoji: "🐍", theme: "kapadokya", story: "Kayaların altında yılanların kraliçesi Şahmeran'ın sarayı. Sırrını öğrenenler yer altından çıkamaz.", tip: "Şahmeran uzaktan altın zehir atar; peri bacalarını siper al.", foes: ["harpi", "kara-elf", "akrep"], champion: { kind: "medusa", name: "Yılan Muhafız" }, title: "Şahmeran'ın Sırdaşı", boss: ["sahmeran"] },
  { name: "Kum Solucanı Çölü", emoji: "🏜️", theme: "col", story: "Kum tepelerinin altında bir şey kıpırdıyor. Yer sarsılınca kaçmak için çok geç.", tip: "Solucan yerden çıkar ve ezer; sürekli hareket et.", foes: ["akrep", "mumya", "harpi"], champion: { kind: "mumya", name: "Kumların Firavunu" }, title: "Kumları Yaran", boss: ["kum-solucani"] },
  { name: "Batık Şehir", emoji: "🐙", theme: "deniz", story: "Okyanusun dibinde ışıkları sönmüş bir şehir. Derinlerden dev dokunaçlar uzanıyor.", tip: "Kraken uzaktan su topu atar; dokunaçlar geniş alanı tarar.", foes: ["golge", "iskelet", "buz"], champion: { kind: "golge", name: "Derinliklerin Sesi" }, title: "Kraken Avcısı", boss: ["kraken"] },
  { name: "Hidra Bataklığı", emoji: "🐲", theme: "bataklik", story: "Her kesilen başın yerine iki baş çıkar derler. Bataklığın kalbinde Hidra uyuyor.", tip: "Hidra beş ağızdan zehir tükürür; zehirli sulara girme.", foes: ["alkarisi", "mantar", "orumcek"], champion: { kind: "alkarisi", name: "Bataklık Annesi" }, title: "Hidra'yı Yenen", boss: ["hidra"] },
  { name: "Kontun Mahzenleri", emoji: "🧛", theme: "gotik", story: "Şatonun altındaki mahzenlerde tabutlar açık. Kan Lordu buradan dünyaya hükmediyor.", tip: "Vampirler ve gölgeler bir arada gelir; ışık büyülerini kullan.", foes: ["vampir", "golge", "yarasa"], champion: { kind: "vampir", name: "Kontun Sağ Kolu" }, title: "Mahzenleri Aydınlatan", boss: ["kan-lordu"] },
  { name: "Ejderha Dağı", emoji: "🌋", theme: "ejder", story: "Dağın içinden geçen tüneller altın ve kemikle dolu. En yukarıda kadim ejderha yatıyor.", tip: "Ejderhanın alevi geniş yayılır; yanlarından saldır.", foes: ["seytan", "kara-sovalye", "golem"], champion: { kind: "kara-sovalye", name: "Ejderha Şövalyesi" }, title: "Ejderha Dağı Fatihi", boss: ["ejderha"] },
  { name: "Kaf Dağı", emoji: "🦚", theme: "bulut", story: "Masalların sonundaki dağ. Zümrüdüanka buraya yuva yapar; ona ulaşan dileğine kavuşur.", tip: "Anka uçar ve ateş yağdırır; menzilli silahlar işe yarar.", foes: ["harpi", "alkarisi", "buz"], champion: { kind: "harpi", name: "Anka'nın Bekçisi" }, title: "Kaf Dağı'na Varan", boss: ["anka"] },
  { name: "Cehennemin Derinlikleri", emoji: "💀", theme: "cehennem", story: "Lav nehirlerinin aktığı en derin tüneller. Ölümsüz büyücü burada güç topluyor.", tip: "Lav ve şeytanlar bir arada; canını sürekli izle.", foes: ["seytan", "cehennem-kopegi", "golge"], champion: { kind: "seytan", name: "Alevlerin Prensi" }, title: "Cehennemden Dönen", boss: ["lich"] },
  { name: "Karanlıklar Kalesi", emoji: "🏰", theme: "kanay", story: "Kan Ayı'ndan önceki son kale. Kadim ejderha ve ölümsüz büyücü son kez birlikte karşınızda.", tip: "İki boss birden! İki Kalp Patlaması'nı birlikte kullanın.", foes: ["kara-sovalye", "minotor", "vampir"], champion: { kind: "minotor", name: "Kalenin Kapı Bekçisi" }, title: "Karanlığı Yaran", boss: ["ejderha", "lich"] },
];

// sıra: üç normal bölüm, sonra büyük tünel; en sonda Kan Ayı
const H = (name: string) => HANDMADE.find((x) => x.name === name)!;
const ORDER: (Stage | "T")[] = [
  H("Goblin Mağarası"), H("Kurt Ormanı"), H("Mantar Bataklığı"), "T",
  H("Örümcek Yuvası"), H("İskelet Mezarı"), draft(NEW.kurtadam), "T",
  H("Yarasa Kuyusu"), draft(NEW.akrep), H("Ork Kampı"), "T",
  draft(NEW.harpi), H("Büyücü Kulesi"), draft(NEW.batik), "T",
  H("Buz Mağarası"), draft(NEW.kristal), H("Trol Köprüsü"), "T",
  draft(NEW.kont), draft(NEW.gorgon), H("Golem Ocağı"), "T",
  draft(NEW.karaelf), draft(NEW.albasti), H("Kara Şövalyeler Kalesi"), "T",
  draft(NEW.karakoncolos), draft(NEW.kopek), draft(NEW.minotor), "T",
  H("Şeytan Çukuru"), draft(NEW.agac), draft(NEW.mumya), "T",
  H("Lich'in Mahzeni"), draft(NEW.golge), draft(NEW.dev), "T",
  draft(NEW.yeralti), draft(NEW.bulut), H("Ejderha Yuvası"), "T",
  draft(NEW.gelin), draft(NEW.kapi), draft(NEW.elmas), "T",
  draft(NEW.yildiz), H("Kan Ayı"),
];

/** Seviye eğrisi: 1. bölüm seviye 1, 50. bölüm seviye 100; güç ve XP seviyeyle büyür (tünel 1,6 kat XP) */
const levelAt = (n: number, total: number) => (n === 1 ? 1 : Math.round(1 + ((n - 1) * 99) / (total - 1)));
const wavesFor = (f: EnemyKind[], big: boolean, boss?: EnemyKind[]): [EnemyKind, number][][] => {
  const [a, b, c2] = [f[0], f[1] ?? f[0], f[2] ?? f[0]];
  if (!big) return [[[a, 3]], [[a, 2], [b, 2]], [[b, 2], [c2, 2]]];
  return [[[a, 4]], [[b, 3], [a, 2]], [[c2, 3], [b, 2]], [[a, 3], [b, 2], [c2, 2]], [...(boss ?? []).map((k): [EnemyKind, number] => [k, 1]), [b, 2]]];
};

let tunnelNo = 0;
export const STAGES: Stage[] = ORDER.map((entry, k) => {
  const id = k + 1, level = levelAt(id, ORDER.length), power = Math.round(20 + (level - 1) * 9.6);
  if (entry === "T") {
    const t = TUNNELS[tunnelNo++];
    const map = generate({ kind: "tunel", seed: id * 1013, ...GEN[t.theme] });
    return { ...draft(t), id, level, power, xp: Math.round((50 + level * 8) * 1.6), big: true, waves: wavesFor(t.foes, true, t.boss), map };
  }
  const handmade = entry.map.length > 0;
  const draftData = entry as Stage & Partial<Draft>;
  const waves = handmade ? entry.waves : wavesFor(draftData.foes ?? ["goblin"], false);
  const map = handmade ? entry.map : generate({ kind: "arena", seed: id * 977, ...GEN[entry.theme] });
  return { ...entry, id, level, power, xp: Math.round(50 + level * 8), waves, map };
});

export const stageById = (id: number) => STAGES.find((s) => s.id === id) ?? null;
