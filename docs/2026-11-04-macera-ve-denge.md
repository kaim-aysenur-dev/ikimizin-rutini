# Şatonun Ötesi — ilk dört bölüm ve savaş dengesi

4 Kasım 2026. İlk dört bölüm ve yayın hazırlığı notları.

## Son arayüz ve birlikte oynama güncellemesi

Sol üst gösterge büyütüldü; gerçek seviye, ünvan ve XP ilerleme çubuğu eklendi. Çalışmadan XP gelince seviye, can ve mana değerleri güncellenir. Yatay oyun çubuğu kaldırılıp araçlar sağ üst köşeye taşındı. Fare tekerleğiyle kamera %70–130 arasında ayarlanabilir; + / - yakınlaştırır, 0 sıfırlar.

Kısayollar: R döndürme, X eşya kaldırma, T çalışma, V tam ekran, M fırtına sesi, E envanter, G maceralar, H yardım. Yazı yazarken bu kısayollar oyunu etkilemez.

**Yalnız giriş kesin olarak kapatıldı.** Tarayıcıda tek oyuncunun beklediği, ikinci eş katılınca seferin açıldığı ve eş ayrılınca kalan oyuncunun tekrar bekleme ekranına döndüğü doğrulandı. Bu kontroller ayrı yerel önizlemede yapıldı; canlı hesaba bağlanılmadı.

## Bölümler

| Bölüm | Önerilen seviye | En düşük giriş seviyesi | Boss | İki kişilik boss canı |
|---|---:|---:|---|---:|
| Kül Ormanı | 2 | 1 | Tek Gözlü Ork Reisi | 1.756 |
| Haydut Geçidi | 10 | 7 | Sürgün Şövalye | 2.508 |
| Trol Bataklığı | 20 | 15 | Yosun Sırtlı Dev Trol | 3.449 |
| Kara Kale | 30 | 24 | Küllerin Efendisi | 4.389 |

Sonraki bölüme geçmek için önceki bölüm tamamlanır. Her bölümde üç hedef, ayrı yürüyüş güzergâhı, yan yollar, bir dinlenme ateşi, gizli sandık ve boss açıklığı bulunur. Üç hedef tamamlanınca boss uyanır.

Yolculuk normal seferdir. Kadim Yemin düşman ve giriş seviyelerini 30, Son Efsane 60 yükseltir. Böylece ilk dört bölümün hedef seviyeleri 2–90 aralığına yayılır. Seviye üst sınırı 100 olarak korunur.

Şato ve evler güvenlidir. Maceralara Gelişim ekranındaki **Maceralar** düğmesinden girilir. **Şatoya dön** düğmesiyle mevcut dünyaya dönülür.

## Silahların gerçek hasarı

Silah hasarı daha önce de vardı. Hasar, eşyanın açılma seviyesi ve silah sınıfından hesaplanıyordu. Yakın dövüşün yanında yay/asa zayıf kalıyordu; sınıfların saldırı aralıkları ve taban hasarları yeniden dengelendi.

Temel hesap: **yuvarla(silah sınıfının taban hasarı × (1 + eşyanın açılma seviyesi × 0,06))**.

Seviye yeni ekipmanın kilidini açar. Daha güçlü silahın hasarını kullanmak için onu şatoda kuşanmak gerekir. Seferin ekipmanı girişte sunucuda doğrulanır ve sefer boyunca sabit kalır.

| Silah | Açıldığı seviye | Tek vuruş | Bekleme | Son kombo vuruşu |
|---|---:|---:|---:|---:|
| Tahta Kılıç | 2 | 11 | 0,45 sn | 20 |
| Avcı Yayı | 4 | 17 | 0,60 sn | Kombo yok |
| Demir Kılıç | 7 | 14 | 0,45 sn | 25 |
| Elf Yayı | 9 | 22 | 0,60 sn | Kombo yok |
| Elf Kılıcı | 10 | 16 | 0,45 sn | 29 |
| Ejder Kılıcı | 16 | 20 | 0,45 sn | 36 |
| Gül Kılıcı | 18 | 21 | 0,45 sn | 38 |
| Ay Kılıcı | 26 | 26 | 0,45 sn | 47 |
| Kalp Kılıcı | 28 | 27 | 0,45 sn | 49 |

Tablodaki değerler zırhsız hedefe ham hasardır. Kılıçta üçüncü, hançerde ikinci vuruş 1,8 kat güçlüdür. Zırhlı düşmana verilen gerçek sayı savunma hesabından sonra çıkar.

Silah sınıfları ayrı davranır: hançer hızlı ve kısa menzilli, mızrak daha uzun menzilli, ağır silah ve iki elli kılıç yavaş ve güçlüdür. Ağır silahlar düşman zırhının %50'sini, mızrak %15'ini yok sayar. Yayın okları ve asanın mermileri ilerleyip hedefe çarpar. Basılı saldırılar sunucu adımlarında devam eder; ağ sorgu sıklığı hızlı silahların hızını belirlemez.

## Zırh, can, mana ve büyü

- Azami can: **100 + karakter seviyesi × 5 + zırhın ek canı**.
- Azami mana: **50 + karakter seviyesi × 3**.
- Fiziksel hasar azaltma: **savunma / (60 + savunma)**; üst sınır %65.
- Büyü hasarında savunmanın %35'i hesaba girer.
- Kalkan, zırh hesabından kalan hasarı kendi dayanıklılığından karşılar.
- Can saniyede 2, mana saniyede 4 yenilenir.
- Kaçınma 0,45 saniye korunma verir; yeniden kullanım aralığı 2,2 saniyedir.
- Buz normal düşmanı 2,5 saniye, boss'u 1 saniye yavaşlatır.
- İki Kalp yakın yol arkadaşını da iyileştirir.

Örnek: 30. seviyede Efsane Zırhı ile 310 can, 140 mana ve yaklaşık %29 fiziksel koruma vardır.

Savaş defterinde açık ekipmanın hasarı, saldırı aralığı, menzili, kombo bilgisi, savunması, ek canı ve büyü maliyetleri görülebilir. Şatonun zırh odasındaki kartlara yaklaşık hasar/sn ve koruma yüzdesi de eklendi.

## Düşman davranışları

Ork baltacı yaklaşıp vuruşunu hazırlar; kurt daha hızlı ve daha az dayanıklıdır. Okçu mesafesini korur ve nişan alır. Muhafızın ön kalkanı fiziksel hasarı azaltır; saldırıya hazırlanırken açık verir. Şaman yaralı yoldaşını iyileştirir. Trol yavaş, dayanıklı ve geniş alan saldırılıdır. Kül muhafızının menzilli büyü tehdidi vardır.

Saldırıdan önce yerde işaret belirir. Ork reisi ilerleyen evrede atılır. Sürgün Şövalye kalkan ve saldırı pencereleriyle savaşır. Dev Trol genişleyen yer sarsıntıları kullanır. Küllerin Efendisi son evrede iki gölge çağırır. Boss evreleri %65 ve %30 can eşiklerinde değişir.

## Birlikte oynama ve düşme

Sefer, o hesabın iki profilinin paylaştığı tek bir ortak savaş durumudur. Düşman canı, hasar, konum, görev ve ödül sunucuda hesaplanır. Aynı komutun tekrar gönderilmesi ikinci bir vuruş üretmez. Aynı anda gelen kayıtlar sürüm karşılaştırmasıyla yeniden denenir.

Sefer yalnız iki kişiyle oynanır. İlk kişi hazırlık yapar ve bekler; diğer profil aynı sefere katılmadan hareket, saldırı, görev ve ödül kazanımı açılmaz. Biri ayrılır veya bağlantısı kesilirse savaş beklemeye geçer. İkisi tekrar hazır olduğunda aynı ilerlemeden devam edilir. Düşman canları baştan iki kişiye göre ayarlanır.

Düşen arkadaşının yanında durup F'yi üç saniye basılı tutarak onu %45 canla kaldırabilirsin. Ekip düşerse son toplanma noktasında toparlanır. Eşyalar ve tamamlanan hedefler korunur; yaşayan düşmanlar ve boss güç toplar.

## Dinlenme ateşi ve sürprizler

Ateşin erzağı bir seferliktir. Yakındaki yaşayan oyuncuların can ve manası dolar. Sefer başında belirlenen rastgele olay:

- %35 olasılıkla baskın: önce yazılı uyarı, ses açıksa boru sesi; dört saniye sonra üç düşman.
- Bazı güvenli dinlenmelerde beyaz geyik ziyareti ve ek yıldız parçaları.
- Yan yoldaki gizli sandık ayrıca yıldız parçaları verir.

Ödüller yıldız parçaları, bölüm tamamlama kaydı ve hatıralardır. Hatıralar macera günlüğünde listelenir. Rutinlerden kazanılan XP değiştirilmedi. Hatıraların eve yerleştirilen eşyalara dönüşmesi sonraki geliştirmeye bırakıldı.

## Yüzlerce bölüme hazırlık

Bölüm kataloğu `lib/expedition-content.ts` içinde tutulur. Kimlik, sıra, seviye, görsel bölge türü, renkler, patika, yan yollar, hedefler, düşman listesi, boss ve hatıra verisi yeni kayıtla genişletilir. Bölüm giriş sırası dört bölüme sabitlenmedi. Yeni bölümler mevcut orman, geçit, bataklık ve kale çizim ailelerini kullanabilir; farklı renk ve güzergâh alabilir.

Katalog sekizerli yüklenmeye hazırdır. Çizim önbelleği en çok sekiz harita tutar. Veritabanı yüzlerce tamamlanma kaydını ve o anki ortak seferi saklar. Bu sürümde dört yazılmış bölüm vardır; henüz yüzlerce bölümün içeriği üretilmedi.

## Doğrulama ve sınırlar

- Tür denetimi ve Next.js derlemesi başarılı.
- Derlenmiş yerel uygulamada oturumsuz macera sayfası girişe yönlendi (307); yeni API'nin GET ve POST istekleri oturumsuz erişimi reddetti (401).
- Saf modül denetimleri, 18 sefer senaryosu, dört haritanın erişilebilirliği ve 1–100 seviye ekipman hesapları geçti.
- Üç zorluk × dört bölüm dengesi kontrol edildi. Düşman zırhı dahil, kalkanı dolanarak ve kesintisiz isabet varsayımıyla iki oyuncunun birlikte saldırdığı boss hesabı yaklaşık 30–46 saniyedir. Kaçınma, yol alma, hedef şaşırma, kalkan ve büyüler gerçek süreyi değiştirir.
- Dört bölüm iki oyuncuyla gerçek dövüş motorunu kullanan kontrollü simülasyonda tamamlandı. Simülasyon savaş konumlarını seçer; gerçek bir oyuncunun bütün bölümü yürüyerek oynadığı ölçüm değildir.
- Eşzamanlı kayıt, komut sınırları, tekrar gönderim, eski sefer, ayrılma sonrası geciken komut ve hesap yalıtımı testleri geçti. Bu kayıt testleri SQL sınırını bellek içi adaptörle taklit eder; gerçek Neon bağlantısı üzerinde yapılmadı.
- Ayrı yerel önizlemede iki profilin aynı sefere katılması, hareket, yakın vuruş, düşmandan hasar alma, büyü maliyeti ve bekleme süresi tarayıcıda gözlendi. Bu önizleme gerçek hesaba bağlanmadı.
- 390 piksel genişlikte telefon görünümü kontrol edildi; yatay taşma görülmedi. Gerçek iPhone tam ekran davranışı denenmedi.
- Önceki vuruş/ok/büyü eşitleme testindeki 147 ekipman aktarımı da geçti.

### Canlıya geçişten önce

`db/migrations/017_expeditions.sql` hazırlandı. Yayın öncesinde bu güncelleme uygulanmalı; ardından gerçek hesapla ortak sefer denemesi yapılmalı.

Yerel kontrol komutları:

```text
npm run typecheck
node scripts/check-expeditions.cjs
node scripts/check-expedition-server.cjs
node scripts/check-combat-sync.cjs
npm run build
```
