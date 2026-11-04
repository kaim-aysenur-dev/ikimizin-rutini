-- Gelişim: bahçe sıfırdan kuruldu ve büyüdü (36x40 -> 56x54). Şato ve evler aynı düzende 10 kare doğuya kaydı;
-- bahçeye konmuş eşyalar da aynı kaymayla yerlerini korur.
update placed_items set tx = tx + 10 where scope = 'bahce';

-- Canlı konumlar eski düzene göre; temizlenir (birkaç yüz milisaniyede yeniden yazılır)
delete from garden_presence where place = 'bahce';
