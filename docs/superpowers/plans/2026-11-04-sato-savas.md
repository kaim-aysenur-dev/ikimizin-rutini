# Şato 3 Kat, Zırh Odaları ve Dövüş Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Hedef:** Şatoya 2. kat (talim) ve 3. kat (iki zırh odası) eklemek. Hazine eşyalarını kalıcı kuşanılabilir hale getirmek. Eşya değerlerine dayalı kılıç kombosu ve büyülerle dövüşü, can ve mana barlarını ve tam ekranı eklemek.

**Mimari:**
- Saf mantık ayrı ve sınanabilir dosyalarda durur:
  - `lib/combat-stats.ts`: eşya değerleri.
  - `lib/combat.ts`: dövüş durumu ve adımı.
  - `lib/room.ts`: kat planları.
- Çizim `lib/castle.ts` ve `lib/combat-draw.ts` içinde.
- Bağlama `components/gelisim/gelisim-world.tsx` içinde.
- Kuşanılanlar yeni `equipment` tablosunda tutulur ve konum eşitlemesiyle karşıya iletilir.

**Teknoloji:** Next.js 16, React 19, TypeScript, Canvas 2D (izometrik piksel), Neon Postgres.

**Spec:** `docs/superpowers/specs/2026-11-04-sato-savas-design.md`

## Sınama düzeni (projede test çatısı yok)

Proje kendi kendini `console.assert` bloklarıyla denetliyor (`if (process.env.NODE_ENV !== "production")`). Her saf modül bu desende denetim bloğu taşır ve bu komutla koşulur:

```bash
bash scripts/check-gelisim.sh
```

Betik `lib/*.ts` saf modüllerini `tsc --module commonjs` ile geçici bir klasöre derler. Ardından her birini `NODE_ENV=development node -e "require(...)"` ile yükler ve çıktıda `Assertion failed` geçerse 1 ile çıkar. Görsel kontrol için çizim modülleri tarayıcıdaki test sayfasında açılır (Görev 4 ve 6). Her görevin sonunda `npx tsc --noEmit` temiz geçmeli.

## Genel Kısıtlar

- Yeni npm paketi yok. Çizim `lib/iso.ts`, `lib/pixel.ts` ve `drawCharacter` ile yapılır.
- F etkileşim, E envanter, R döndürme olarak kalır. Saldırı J ya da sol tık, büyüler 1–4 tuşlarıdır. Yerleştirme, kaldırma ve döndürme modlarında sol tık eski işini yapar.
- Can 100 + seviye×5, mana 50 + seviye×3. İkisi zamanla dolar.
- Büyü yuvası 4 tane.
- Kuşanma sunucuda seviyeye göre doğrulanır (`levelOf(xp).level >= gear.level`).
- Mevcut ev, bahçe ve 1. kat davranışı değişmez.
- Mobilde ⚔ ve 1–4 düğmeleri yön tuşlarının yanında durur.
- Şatonun katları konum eşitlemesinde ayrı yerlerdir: `sato`, `sato:2`, `sato:3`.

## İnceleme Odağı

1. **Seviyesi yetmeyen eşyayı kuşanma isteği** (elle POST): sunucu 403 vermeli ve kayıt değişmemeli. Görev 2 testi.
2. **Kuşanılmış eşya sonradan geçersiz** (ör. eşya kimliği kod değişince kalktı): görünüm ve dövüş varsayılana düşmeli, çökmemeli. Görev 2'de `sanitizeEquipment` testi.
3. **Mana yetmezken büyü tuşuna basmak ya da bekleme süresi dolmadan tekrar basmak:** büyü atılmamalı, mana eksiye düşmemeli. Görev 5 testi.
4. **Merdivende kat değiştirirken tuşa basılı kalmak:** yeni katta merdivenden hemen geri dönülmemeli (mevcut kapı geçişindeki tuş sıfırlama korunur, doğma noktası merdivenin önünde olur). Görev 3'te yerleşim testi.
5. **Tam ekran desteklenmeyen tarayıcı (iOS Safari):** sayfa içi tam ekran sınıfına düşmeli, HUD görünmeli. Görev 7'de elle kontrol.

---

### Görev 1: Eşya değerleri ve Ayşenur'un kılıçları

**Dosyalar:**
- Oluştur: `lib/combat-stats.ts`
- Değiştir: `lib/gear.ts` (HANDMADE listesine Ayşenur kılıçları)
- Oluştur: `scripts/check-gelisim.sh`

**Arayüzler:**
- Üretir:
  - `type WeaponStyle = "kilic" | "hancer" | "yay" | "mizrak" | "agir" | "asa" | "iki-elli"`
  - `type WeaponStats = { style: WeaponStyle; damage: number; cooldown: number; range: number; combo: number; trail?: string }`. `cooldown` saniye, `range` kare, `combo` en çok ardışık vuruş.
  - `type ArmorStats = { tier: "cloth" | "leather" | "steel" | "gold" | "legend"; defense: number; bonusHp: number }`
  - `type SpellShape = "kivilcim" | "ok" | "kalkani" | "muhru" | "yagmuru" | "patlamasi" | "sifa" | "ejder" | "iki-kalp"`
  - `type SpellStats = { shape: SpellShape; color: string; light: string; damage: number; heal: number; mana: number; cooldown: number; range: number }`
  - `weaponStats(id: string): WeaponStats | null`, `armorStats(id: string): ArmorStats | null`, `spellStats(id: string): SpellStats | null`. Bilinmeyen kimlikte `null` döner.
  - `const FIST: WeaponStats` (silahsız yumruk).

- [ ] **Adım 1:** `scripts/check-gelisim.sh` betiğini yukarıdaki "Sınama düzeni"ne göre yaz. Koşulacak modüller: `combat-stats`, `combat`, `room`, `castle`.
- [ ] **Adım 2: Başarısız denetimleri yaz** (`lib/combat-stats.ts` sonunda):
  - `weaponStats("tahta-kilic")!.style === "kilic"` ve `.combo === 3`.
  - `weaponStats("kalp-kilici")!.damage > weaponStats("ejder-kilici")!.damage` ve bu da `> weaponStats("tahta-kilic")!.damage`.
  - `weaponStats("avci-yayi")!.style === "yay"` ve `range >= 6`.
  - `armorStats("efsane-zirhi")!.defense > armorStats("tunik")!.defense` ve `armorStats("tunik")!.tier === "cloth"`.
  - `spellStats("alev-topu")!.shape === "kivilcim"`.
  - `spellStats("sifa")!.heal > 0`.
  - `spellStats("buyu-buz-muhru")!.shape === "muhru"`.
  - `weaponStats("yok") === null`.
  - `GEAR.filter((g) => g.kind === "Silah").every((g) => weaponStats(g.id))`. Zırh ve büyü için de aynı denetim.
- [ ] **Adım 3:** `bash scripts/check-gelisim.sh` komutunu koş. Beklenen: dosya yok ya da assert hatası, çıkış 1.
- [ ] **Adım 4: Uygula.**
  - **Silah tarzı:**
    - Üretilmiş eşyalarda kimlik önekinden gelir: `kilic-`, `hancer-`, `yay-`, `mizrak-`, `balta-` ve `cekic-` (agir), `asa-`, `buyuk-kilic-` (iki-elli).
    - Elle çizilmişler için tablo: tahta-kilic, demir-kilic, ejder-kilici ve kalp-kilici kilic; avci-yayi ve elf-yayi yay; gumus-hancer hancer; yildiz-mizragi mizrak.
  - **Hasar:** `taban[tarz] × (1 + seviye × 0.06)`. Tabanlar: kilic 10, hancer 6, yay 8, mizrak 11, agir 16, asa 7, iki-elli 18.
  - **Bekleme:** hancer 0.22, kilic 0.35, yay 0.6, mizrak 0.5, agir 0.75, asa 0.55, iki-elli 0.8.
  - **Menzil:** hancer 0.9, kilic 1.2, iki-elli 1.6, agir 1.2, mizrak 2.2, yay 7, asa 6.
  - **Kombo:** kilic 3, hancer 2, diğerleri 1.
  - **Kalp Kılıcı ve Ejder Kılıcı** kılıç tarzıdır, ayrıca `trail` rengi taşır (kalp "#e48aa0", ejder "#f0a24a").
  - **Zırh kademesi:** tunik cloth, deri-zirh leather, celik-zirh steel, altin-zirh gold, efsane-zirhi legend. Üretilmişlerde seviyeye göre: <6 cloth, <12 leather, <20 steel, <30 gold, değilse legend. `defense = round(seviye × 0.8)`, `bonusHp = seviye × 2`.
  - **Büyüler:**
    - Üretilmiş: `buyu-<element>-<şekil>`, renk ELEMENTS'ten gelir.
    - Elle çizilmiş: isik kivilcim (ışık), sifa sifa, kalkan-buyusu kalkani, alev-topu kivilcim (ateş), buz muhru (buz), simsek yagmuru (fırtına), ejder-cagrisi ejder, iki-kalp iki-kalp.
    - Hasar `8 + seviye × 0.9`, mana `8 + seviye × 0.4`. Bekleme şekle göre: kivilcim 0.6, ok 0.8, kalkani 6, muhru 3, yagmuru 4, patlamasi 2.5, sifa 5, ejder 12, iki-kalp 10.
    - Şifa büyüleri `heal = 20 + seviye`, `damage = 0`.
  - **Ayşenur'un kılıçları:** `lib/gear.ts` HANDMADE listesine üç kılıç gelir: `elf-kilici` (Lv 10), `gul-kilici` (Lv 18), `ay-kilici` (Lv 26). Hepsi `kind: "Silah"`, `owner: "Ayşenur"`, `sword()` yardımcısıyla kendi paletinde çizilir. Türkçe açıklamaları diğer eşyaların üslubundadır.
- [ ] **Adım 5:** `bash scripts/check-gelisim.sh` ve `npx tsc --noEmit` koş. Beklenen: çıkış 0.
- [ ] **Adım 6:** Commit: `git add lib/combat-stats.ts lib/gear.ts scripts/check-gelisim.sh` ve ardından `git commit -m "Gelişim: eşya değerleri ve Ayşenur'un kılıçları"`.

### Görev 2: Kuşanma kaydı (veritabanı, uç nokta, eşitleme)

**Dosyalar:**
- Oluştur: `db/migrations/015_equipment.sql`, `lib/equipment.ts` (saf), `lib/equipment-server.ts`, `app/api/gelisim/kusan/route.ts`
- Değiştir: `lib/room-server.ts` (syncPresence diğerlerinin kuşandıklarını ve son saldırısını döndürür), `app/api/gelisim/konum/route.ts` (`action` alanını alır), `app/(rutin)/(panel)/gelisim/page.tsx` (kuşanılanları yükler)

**Arayüzler:**
- Tüketir: Görev 1'deki `weaponStats`, `armorStats`, `spellStats` ve `GEAR`.
- Üretir:
  - `type Equipment = { armor: string | null; weapon: string | null; spells: string[] }` ve `const NO_EQUIPMENT: Equipment`.
  - `sanitizeEquipment(e: unknown, level: number): Equipment`. Bilinmeyen kimlikleri, seviyesi yetmeyenleri ve yanlış türdekileri atar, büyüleri en çok 4 tane ve tekrarsız bırakır.
  - `toggleEquip(e: Equipment, gearId: string): Equipment`. Kuşanılmışsa çıkarır. Büyüde ilk boş yuvaya ekler, yuvalar doluysa en eskisinin yerine koyar.
  - `equipmentOf(accountId: string): Promise<Record<string, Equipment>>` (sunucu).
  - `POST /api/gelisim/kusan` gövdesi `{ gearId: string }`, yanıtı `{ equipment: Equipment }`. Seviye yetmezse 403 ve "Bu eşya seviye N'de açılır.".
  - Konum yanıtındaki `others[]` her kişi için ayrıca `equipment: Equipment` ve `action: { kind: "vurus" | "buyu"; id: string; at: number } | null` taşır.
  - Konum isteği isteğe bağlı `action` alanını alır.

- [ ] **Adım 1: Başarısız denetimleri yaz** (`lib/equipment.ts` sonunda):
  - `sanitizeEquipment({ armor: "efsane-zirhi", weapon: "tahta-kilic", spells: [] }, 5)`. Beklenen: armor null (Lv 30 gerekir), weapon "tahta-kilic".
  - `sanitizeEquipment({ weapon: "alev-topu" }, 50).weapon === null` (yanlış tür).
  - `sanitizeEquipment("çöp", 10)` sonucu `NO_EQUIPMENT` ile eşit.
  - Altı büyülük bir listede sonuç 4 büyü olur.
  - `toggleEquip(NO_EQUIPMENT, "tahta-kilic").weapon === "tahta-kilic"` ve ikinci çağrıda null.
  - Dolu yuvalara beşinci büyü gelince ilk büyü düşer.
- [ ] **Adım 2:** `bash scripts/check-gelisim.sh` koş (`equipment` modülü listeye eklenir). Beklenen: FAIL.
- [ ] **Adım 3: Uygula.**
  - **015 migration:**
    - `equipment` tablosu: `user_id uuid primary key references users on delete cascade`, `armor text`, `weapon text`, `spells text[] not null default '{}'`, `updated_at timestamptz not null default now()`.
    - `garden_presence` tablosuna `action jsonb` sütunu.
  - **Uç nokta:** kişinin XP'sini `adventure()` ile alır, `toggleEquip` ardından `sanitizeEquipment` uygular ve upsert eder.
  - **Konum:** `action` alanı yalnız `kind` "vurus" ya da "buyu" ise, `id` 60 karakterden kısaysa ve `at` sayıysa saklanır.
  - **Sayfa:** `GelisimWorld`'e `initialEquipment: Record<string, Equipment>` verir. Değerler profil seviyesine göre `sanitizeEquipment`'tan geçmiş olur.
- [ ] **Adım 4:** `bash scripts/check-gelisim.sh` ve `npx tsc --noEmit` koş. Beklenen: PASS.
- [ ] **Adım 5:** Commit: "Gelişim: kuşanma kaydı ve eşitleme".

### Görev 3: Şatonun 2. ve 3. katı, sarmal merdiven

**Dosyalar:**
- Değiştir: `lib/room.ts` (kat planları), `lib/castle.ts` (kat dekoru, merdiven, zırh istasyonları), `lib/gelisim-scene.ts` (`SceneState` kat bilgisi), `components/gelisim/gelisim-world.tsx` (`Where` katı, merdiven geçişi, konum yeri), `app/api/gelisim/konum/route.ts` (`sato:2`, `sato:3` kabulü)

**Arayüzler:**
- Üretir:
  - `type Floor = 1 | 2 | 3`
  - `TRAINING_HALLS` (2. kat): `arena`, `okculuk`, `buyu-odasi`, `balkon`.
  - `ARMORY_HALLS` (3. kat): `cengiz-odasi`, `aysenur-odasi`, `koridor`.
  - `castlePlan(floor: Floor): Plan`
  - `STAIRS = { i: 12, j: 1, w: 2, d: 2 }`, her katta aynı köşede (büyük salonun sağ arka köşesi; 1. kattaki zırh askısı ve silah rafı yer açmak için kaydırılır).
  - `stairsTarget(floor: Floor, dir: "up" | "down"): Floor | null`
  - `castleDecor(floor: Floor): Decor[]`, `castleBlocked(floor: Floor): Set<string>`
  - `type Station = { kind: "Zırh" | "Silah" | "Büyü"; owner: "cengiz" | "aysenur"; i: number; j: number }` ve `ARMORY_STATIONS: Station[]`.
  - `Where` şatoda `{ scope: "sato"; floor: Floor }` olur, `placeOf` "sato" ya da "sato:2", "sato:3" döndürür.
  - Talim hedefleri: `TARGETS: { id: string; kind: "manken" | "hedef-tahtasi" | "run-tasi"; i: number; j: number }[]` (2. kat).
- [ ] **Adım 1: Başarısız denetimleri yaz** (`lib/room.ts` ve `lib/castle.ts`):
  - Her katın planı boşluksuz dolar.
  - Merdiven karelerinden her salona BFS ile ulaşılır (her kat ayrı denenir; denetim kodu harness'teki BFS'nin aynısı).
  - Hiçbir dekor kapı ya da merdiven karesini kapatmaz.
  - `stairsTarget(1, "up") === 2`, `stairsTarget(3, "up") === null`.
  - `ARMORY_STATIONS` her iki odada her türden en az bir istasyon içerir.
  - Doğma noktası (merdivenin önü) bloklu değildir.
- [ ] **Adım 2:** `bash scripts/check-gelisim.sh` koş. Beklenen: FAIL.
- [ ] **Adım 3: Uygula.**
  - **Merdiven:** Taş sarmal merdiven çizimi, `PROPS["merdiven"]`, düz değil. Üstündeki karede "Yukarı çık / Aşağı in" etkileşimi gösterilir.
  - **Kat geçişi:** F ile ya da merdivenin içine yürüyünce kararma geçişiyle olur. Merdiven her katta, kendi önündeki karede doğar.
  - **2. kat:**
    - Arenada 4 manken.
    - Okçulukta uzak duvarda 3 hedef tahtası.
    - Büyü odasında 3 rün taşı ve Gandalf.
    - Balkon: dış kenarı alçak korkuluklu, zemini ıslak taş, üstünde ekran yağmuru çizilen açık alan (`drawScene` balkon karelerinde yağmuru kırparak çizer).
  - **3. kat:** İki oda Cengiz (lacivert sancak) ve Ayşenur (kızıl sancak) renginde. Her odada zırh askısı, silah rafı ve büyü kürsüsü istasyonu var. Ortada iki odayı bağlayan koridor ve merdiven.
  - **Kat çizimi:** `castleInterior` kat numarası alır. 2. ve 3. kat aynı duvar ve pencere ustalığında ama farklı salon zeminleriyle çizilir.
- [ ] **Adım 4:** `bash scripts/check-gelisim.sh` ve `npx tsc --noEmit` koş. Beklenen: PASS. Harness'te `?s=sato&f=2` ve `?s=sato&f=3` ile katlar görsel olarak kontrol edilir (harness'e `f` parametresi eklenir).
- [ ] **Adım 5:** Commit: "Gelişim: şatonun 2. ve 3. katı, sarmal merdiven".

### Görev 4: Kuşanma odası paneli ve karakter görünümü

**Dosyalar:**
- Oluştur: `components/gelisim/armory-panel.tsx`
- Değiştir: `components/gelisim/gelisim-world.tsx`, `lib/gelisim-scene.ts` (`Hero` kuşanılanları taşır, elde silah çizimi) (zırh mevcut `outfit` ve `tint` ile verilir, `lib/pixel.ts` değişmez)

**Arayüzler:**
- Tüketir: Görev 2'deki `Equipment`, `toggleEquip` ve `/api/gelisim/kusan`. Görev 3'teki `ARMORY_STATIONS`. Görev 1'deki `armorStats`.
- Üretir:
  - `Hero` tipine `gear?: { weapon: string | null; armorTier: ArmorStats["tier"] | null; swing?: { at: number; step: number } }` eklenir.
  - `<ArmoryPanel kind level equipment onToggle onClose />`
  - `Near.kind` içine "istasyon" eklenir.
- [ ] **Adım 1:** İstasyon etkileşimi. İstasyonun yanında F'ye basınca o türün panelini açar. Panel `GEAR`'ı türe göre seviye sırasıyla listeler:
  - Açık olanlar `PixelIcon` ile çizilir, kilitliler gri olur ve "🔒 Seviye N" yazar.
  - Kuşanılan işaretlidir.
  - Kartta değerler görünür: silahta hasar, hız, menzil; zırhta savunma ve ek can; büyüde hasar ya da şifa, mana, bekleme.
  - Tıklayınca `/api/gelisim/kusan` çağrılır, iyimser güncelleme yapılır, hata gelirse geri alınır.
- [ ] **Adım 2:** Görünüm.
  - Kuşanılmış zırh varsa `TIERS[armorStats(id).tier]` outfit ve tint'i seviye kademesinin yerine geçer. Yoksa eski `look(level)` sürer.
  - Elde silah: `gear.ts` çizimi `drawCharacter` el noktasına (`anchors.hand`) küçültülmeden, yöne göre aynalanarak ve savuruşta döndürülerek çizilir. Bu iş `lib/combat-draw.ts` içinde `drawHeld(c, gearId, hand, dir, swingK)` olarak yapılır.
  - Diğer kişinin kuşandıkları konum yanıtından gelir.
- [ ] **Adım 3:** `npx tsc --noEmit` koş. Harness'te her zırh kademesi ve her silah tarzı için iki karakter yan yana çizilip göz kontrolü yapılır (harness'e `?gear=` parametresi eklenir).
- [ ] **Adım 4:** Commit: "Gelişim: zırh odası paneli, kuşanılanlar karakterin üstünde".

### Görev 5: Dövüş motoru (saf)

**Dosyalar:**
- Oluştur: `lib/combat.ts`

**Arayüzler:**
- Tüketir: Görev 1'deki değerler, Görev 2'deki `Equipment`.
- Üretir:
  - `type Fighter = { hp: number; maxHp: number; mana: number; maxMana: number; shield: number; comboStep: number; comboAt: number; readyAt: number; spellReady: Record<string, number> }`
  - `newFighter(level: number, e: Equipment): Fighter`
  - `type Target = { id: string; i: number; j: number; hp: number; maxHp: number; hitAt: number }`
  - `type Effect = { kind: "vurus" | SpellShape | "hasar" | "sifa-sayi"; i: number; j: number; dir: 1 | -1; at: number; until: number; color?: string; value?: number; ti?: number; tj?: number }`
  - `attack(f: Fighter, e: Equipment, at: { i: number; j: number; dir: 1 | -1 }, targets: Target[], now: number): Effect[]`. Bekleme süresine uyar, kombo adımını artırır (pencere 0.5 sn, son adımda hasar ×1.8), menzildeki ve baktığı yöndeki hedeflere hasar verir, mermi silahlarında (yay, asa) mermi efekti üretir.
  - `cast(f: Fighter, e: Equipment, slot: 0 | 1 | 2 | 3, at: { i: number; j: number; dir: 1 | -1 }, targets: Target[], now: number, partnerNear: boolean): Effect[]`. Mana ve bekleme yetmezse `[]` döner ve hiçbir şeyi değiştirmez.
  - `tick(f: Fighter, dt: number): void`. Can 2/sn, mana 4/sn dolar. Kalkan söner.
  - `stepEffects(effects: Effect[], targets: Target[], now: number): Effect[]`. Mermileri ilerletir, çarpınca hasar uygular, süresi dolanları atar. Hedef canı 0 olunca 2 sn sonra tam dolar (manken yeniden kalkar).
- [ ] **Adım 1: Başarısız denetimleri yaz:**
  - `newFighter(10, NO_EQUIPMENT).maxHp === 150` ve `.maxMana === 80`.
  - Efsane Zırhı ile `maxHp` `bonusHp` kadar artar.
  - Tahta kılıçla üç `attack` (0.4 sn arayla) sonrası üçüncü vuruşun hasarı ilkinin 1.8 katıdır.
  - Bekleme dolmadan ikinci `attack` boş döner.
  - 0.5 sn'den uzun arada kombo 1'e döner.
  - Mana 5 iken Alev Topu `cast` sonucu `[]` olur ve mana 5 kalır.
  - Şifa canı `maxHp`'yi aşmaz.
  - Arkadaki (ters yöndeki) hedef kılıçtan hasar almaz.
  - Yay oku `stepEffects` ile ilerleyip 5 kare ötedeki hedefe çarpar.
  - `tick` mana ve canı en çok `max`'a kadar doldurur.
- [ ] **Adım 2:** `bash scripts/check-gelisim.sh` koş. Beklenen: FAIL.
- [ ] **Adım 3: Uygula.** "Baktığı yön" izometrik ekran yönüdür: hedefin ekran x farkının işareti `dir` ile aynı olmalı ve yaklaşık dikey fark menzilin yarısını geçmemeli. `muhru`, `patlamasi` ve `yagmuru` alan etkisidir: muhru çevrede 2 kare, patlamasi 1.5 kare, yagmuru baktığı yönde 3 kare ilerideki 2 karelik alan. `ejder` bakılan yöndeki şeritte her hedefe vurur. `iki-kalp` `partnerNear` ise iki kat şifa verir (karşı tarafın canı kendi ekranında, `action` ile tetiklenir).
- [ ] **Adım 4:** `bash scripts/check-gelisim.sh` koş. Beklenen: PASS.
- [ ] **Adım 5:** Commit: "Gelişim: dövüş motoru".

### Görev 6: Dövüşü oyuna bağlama (giriş, efekt çizimi, can barı)

**Dosyalar:**
- Oluştur: `lib/combat-draw.ts` (efektler, hedefler, hasar sayıları, elde silah), `components/gelisim/combat-hud.tsx`
- Değiştir: `components/gelisim/gelisim-world.tsx`, `lib/gelisim-scene.ts` (`SceneState.effects` ve `targets`, derinlik sıralı çizim), `app/(rutin)/pixel-theme.css` (HUD ve mobil düğmeler)

**Arayüzler:**
- Tüketir: Görev 5'in tamamı, Görev 3'teki `TARGETS`, Görev 4'teki `drawHeld`.
- Üretir:
  - `drawEffect(c, o, e: Effect, t)`, `drawTarget(c, o, tg: Target, t)`
  - `<CombatHud hp maxHp mana maxMana shield spells={{ id, readyAt, mana }[]} now />`: sol üstte can barı (kırmızı), altında mana barı (mavi), altında 4 büyü yuvası (ikon, tuş numarası, bekleme süresi örtüsü).
- [ ] **Adım 1: Giriş.**
  - Klavyede `j` ile `attack`, `1`–`4` ile `cast`.
  - Yürüme modunda sahneye sol tık `attack` yapar. Yerleştirme, kaldırma ve döndürme modlarında eski davranış sürer.
  - Mobilde ⚔ ve 1–4 düğmeleri (`gw-pad` yanında).
  - Oturuyorsa saldırı önce kaldırır.
  - Her saldırı ve büyü `action` olarak konum isteğine eklenir. Gelen `action` diğer kişinin efektini oynatır, hasar hesaplanmaz.
- [ ] **Adım 2: Çizim.**
  - Kılıç savuruşu yay biçiminde iz çizer (`trail` rengi varsa o renkte).
  - Mermiler ve alan büyüleri şekline ve rengine göre çizilir. Büyü çizimleri `gear.ts`'deki şekillerin büyütülmüş, hareketli izometrik halleridir.
  - Hasar sayıları yukarı süzülür, şifa yeşil yazılır.
  - Vurulan manken sarsılır, canı küçük bir barla görünür.
  - Şimşek büyüsü ekranı `stormFlash` gibi ağartır.
- [ ] **Adım 3:** `npx tsc --noEmit` koş. Harness'e efekt önizlemesi eklenir (`?fx=<büyü id>`), her büyü şekli ve kılıç kombosu göz kontrolünden geçer.
- [ ] **Adım 4:** Commit: "Gelişim: dövüş, büyüler ve can barı".

### Görev 7: Tam ekran

**Dosyalar:**
- Değiştir: `components/gelisim/gelisim-world.tsx`, `app/(rutin)/pixel-theme.css`

- [ ] **Adım 1: Uygula.**
  - Sahneye ilk tıklamada ve üst çubuktaki "⛶ Tam ekran" düğmesiyle `.gw` kapsayıcısı `requestFullscreen()` ile tam ekrana geçer.
  - Destek yoksa ya da istek reddedilirse `.gw.is-full` sınıfı eklenir: sabit konumlu, `inset: 0`, `z-index` üstte.
  - Esc ve `fullscreenchange` ile çıkılır.
  - Tuval yeniden boyutlanır (mevcut `ResizeObserver`). HUD, üst çubuk ve mobil düğmeler tam ekranda görünür kalır.
  - Yerleştirme modundaki tıklama tam ekranı tetiklemez.
- [ ] **Adım 2:** `npx tsc --noEmit` ve `npx next build` koş. Beklenen: başarılı.
- [ ] **Adım 3:** Commit: "Gelişim: tam ekran".

### Görev 8: Son doğrulama ve yayın

- [ ] **Adım 1:** `bash scripts/check-gelisim.sh`, `npx tsc --noEmit` ve `npx next build` koş. Hepsi temiz olmalı.
- [ ] **Adım 2:** Harness'te 1., 2. ve 3. katlar, zırh kademeleri, silah tarzları ve büyüler son kez göz kontrolünden geçer.
- [ ] **Adım 3:** Kullanıcı onayıyla `git push origin main`, ardından `npm run db:migrate` (015).
