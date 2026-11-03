# Şato: 3 kat, zırh odaları ve dövüş — tasarım

Tarih: 2026-11-04 · Kapsam: Gelişim bölümü (`components/gelisim/gelisim-world.tsx`, `lib/castle.ts`, `lib/gelisim-scene.ts`)

## Niyet

Cengiz ve Ayşenur gerçek bir aksiyon oyunu gibi oynamak istiyor. Seviye atladıkça açılan zırhları, silahları ve büyüleri şatonun en üst katındaki odalarından seçip kuşanacaklar. Kuşandıkları karakterlerinin üstünde kalacak. Kılıçla kombo yapıp büyü atabilecekler. Canavarlar ve boss'lar **sonraki aşama**: bu aşama onlara zemin hazırlıyor. Şimdilik talim mankenlerine ve hedeflere vuruyorlar.

## Hedefler

1. **Şato 3 kat.**
   - 1. kat şu anki altı salon, aynen kalıyor.
   - 2. kat talim katı.
   - 3. kat iki ayrı zırh odası.
   - Katlar arası geçiş büyük salonun köşesindeki **sarmal taş merdivenle** (kullanıcının seçimi). Merdiven her katta aynı köşede durur, üstüne yürüyünce kararma geçişiyle üst ya da alt kata çıkılır.
2. **2. kat, talim katı:**
   - Talim arenası: kum zemin, talim mankenleri.
   - Okçuluk alanı: hedef tahtaları.
   - Büyü odası: rünlü taşlar, büyülü hedefler, Gandalf.
   - Fırtına balkonu: açık hava, yağmur, bahçeye bakar.
3. **3. kat, zırh odaları:** Cengiz'in odası ve Ayşenur'un odası. Hazine'deki eşyalar raflarda, askılarda ve kaidelerde durur.
   - Açık olanlar renkli, kilitliler gri siluet ve "Seviye N" yazısıyla görünür.
   - Yanına gidip F'ye basınca kuşanılır.
   - Herkes iki odaya da girebilir. Kişi kendi seviyesiyle açılanları kuşanır, oda sahibine bağlı değildir.
4. **Silah sınırı kalkar (kullanıcının seçimi):** İkisi de her silahı kullanabilir. Hazine'deki "sahip" bilgisi yalnız hikâye etiketi olarak kalır. **Ayşenur'a kılıçlar eklenir:** Hazine'ye yeni kılıçlar girer (en az 2–3 tane, ör. ince elf kılıcı, gül saplı kılıç) ve seviyeyle açılır.
5. **Kuşanılanlar kalıcıdır:** bir zırh, bir silah ve 4 yuvaya kadar büyü. Veritabanında saklanır. Karakter evde, bahçede ve şatoda kuşandığıyla görünür. Diğer kişi de aynı yerdeyken bunu görür.
6. **Dövüş:**
   - Sol üstte can barı, altında mana barı.
   - J ya da sol tık silah vuruşu. Kılıçta arka arkaya üç vuruş kombo yapar ve üçüncüsü güçlü bir savuruştur.
   - Yay ok atar, hançer hızlı iki vuruş yapar, mızrak uzun menzilli dürter.
   - 1–4 tuşları büyüleri atar ve büyüler mana harcar.
   - Hedefe vurunca hasar sayısı uçar, hedef sarsılır.
   - Can ve mana zamanla dolar. Şimdilik hasar veren düşman olmadığı için can bar yalnız İyileştirme ve Kalkan gibi büyülerle oynar. Düşman geldiğinde azalacak.
7. **Tam ekran:** Gelişim alanına tıklayınca (ya da bir düğmeyle) oyun tarayıcının tam ekran moduna geçer. Esc ile çıkılır. Can barı ve büyü yuvaları tam ekranda da görünür.

## Hedef olmayanlar (bu aşamada yok)

- Canavarlar, boss'lar, düşman yapay zekâsı, ölme ve yeniden doğma.
- İki oyuncu arasında düello ya da birbirine hasar verme.
- Ganimet, yeni eşya düşürme, eşya satma.
- Dövüş istatistiklerinin sunucuda tutulması. Hasar sayıları yalnız ekranda görünür.

## Yapılmaması gerekenler

- Mevcut ev, bahçe ve 1. kattaki hiçbir şey bozulmamalı. Oturma, piyano, masa, posta kutusu ve eşya yerleştirme aynen çalışmalı.
- Seviye kilidi istemcide kandırılamamalı. Kuşanma isteği sunucuda seviyeye göre doğrulanır.
- Tuşlar çakışmamalı. F etkileşim, E envanter ve R döndürme olarak kalır. Saldırı tuşları bunlarla karışmamalı.
- Mobil kırılmamalı. Dokunmatikte yön tuşlarının yanında saldırı ve büyü düğmeleri olur.

## Kısıtlar

- Çizim mevcut izometrik piksel sistemiyle yapılır (`lib/iso.ts`, `drawCharacter`). Yeni kütüphane eklenmez.
- Hazine eşyaları `lib/gear.ts` içindeki 24×24 çizimlerdir. Elde tutulan silah ve büyü efektleri bunlardan ya da benzer küçük çizimlerden türetilir.
- Zırh görünümü şu an seviye kademesinden geliyor (`TIERS`: kumaş, deri, çelik, altın, efsane). Bunun yerine kuşanılan zırh belirleyici olur. Zırhın kademe karşılığı tablo hâlinde tanımlanır. Hiç kuşanma yapılmamışsa eski davranış sürer.
- Konum eşitleme yarım saniyede bir yapılır (`/api/gelisim/konum`). Diğer kişinin kuşandıkları bu yanıtla ya da sayfa yüklenirken gelir.
- Yeni bir veritabanı tablosu için yeni bir migration gerekir (015).

## Kararlaştırılanlar (kullanıcı)

- Sarmal merdiven, büyük salonun köşesinde.
- 2. kat talim katı: arena, okçuluk, büyü odası, fırtına balkonu.
- 3. kat: Cengiz'in ve Ayşenur'un ayrı zırh odaları.
- İkisi de her silahı kullanır, Ayşenur'a kılıçlar eklenir.
- Kuşanılanlar karakterin üstünde kalıcı olarak durur.
- Tam ekrana tıklayarak geçilir.
- Canavarlar ve boss'lar sonra.

## Uygulayıcıya kalanlar (benim kararlarım, kullanıcı itiraz edebilir)

- **Tuşlar:**
  - J ya da sol tık saldırı. Yerleştirme modunda sol tık eski işini yapar.
  - 1–4 büyü yuvaları.
  - Kombo penceresi yaklaşık 0,5 saniye.
  - Mobilde ⚔ ve 1–4 düğmeleri.
- **Can ve mana değerleri:**
  - Can 100 + seviye×5, mana 50 + seviye×3.
  - Zırh, ileride düşman hasarını azaltacak bir savunma değeri taşır.
- **Büyülerin oyundaki karşılığı:**
  - Işık Kıvılcımı: kısa menzilli parlama.
  - İyileştirme: can doldurur.
  - Kalkan: geçici koruma halkası.
  - Alev Topu: ileri uçan mermi.
  - Buz Rüzgârı: çevreye alan hasarı.
  - Şimşek: hedefe gökten düşer.
  - Ejder Çağrısı: ekranı geçen ejder alevi.
  - İki Kalp: ikiniz yan yanayken ikinizi de iyileştirir.
- **Kat yerleşimleri:** 2. ve 3. kat 1. katla aynı ölçüde (36×24) ve aynı izometrik "kesit" duvar tarzında olur.
- **Diğer:** Merdiven 2×2 karelik, oturma ve kapı kurallarına dahil.
- **Kayıt:** `equipment` tablosu (user_id, armor_id, weapon_id, spells[]). Kuşanma uç noktası `POST /api/gelisim/kusan` olur ve seviyeyi doğrular.
- **Tam ekran:** Tarayıcı Fullscreen API ile yapılır. Desteklenmezse sayfa içi tam ekran yerleşimine düşer.
- **Birbirinizin saldırıları:** Diğer kişinin kılıç savuruşlarını ve büyülerini canlı görürsünüz. Konum isteğine son saldırının türü ve zamanı eklenir. Hasar yalnız kendi ekranında hesaplanır.
- **Konum eşitlemesi:** Katlar ayrı yerler sayılır (`sato`, `sato:2`, `sato:3`), yalnız aynı kattakiler birbirini görür.
- **Kuşanma etkileşimi:** Kuşanılmış bir eşyada F'ye basınca o eşya çıkarılır. Büyüde ilk boş yuvaya eklenir, yuvalar doluysa en eskisinin yerine geçer.
- **Başka yerlerde dövüş:** Saldırı ve büyüler her yerde atılabilir (ev, bahçe, şato), ama hedefler yalnız 2. katta bulunur.
