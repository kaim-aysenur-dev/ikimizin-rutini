-- Ay Kapısı 50 bölüme çıktı: her dört bölümde bir büyük tünel araya girdiği için elle çizilmiş 16 bölümün numarası değişti.
-- Geçilen bölüm kayıtları yeni numaralarına taşınır (eski -> yeni). Büyükten küçüğe gidilir ki benzersizlik kuralı çakışmasın.
update battle_rewards set ref = 50 where kind = 'zindan' and ref = 16;
update battle_rewards set ref = 43 where kind = 'zindan' and ref = 15;
update battle_rewards set ref = 37 where kind = 'zindan' and ref = 14;
update battle_rewards set ref = 33 where kind = 'zindan' and ref = 13;
update battle_rewards set ref = 27 where kind = 'zindan' and ref = 12;
update battle_rewards set ref = 23 where kind = 'zindan' and ref = 11;
update battle_rewards set ref = 19 where kind = 'zindan' and ref = 10;
update battle_rewards set ref = 17 where kind = 'zindan' and ref = 9;
update battle_rewards set ref = 14 where kind = 'zindan' and ref = 8;
update battle_rewards set ref = 11 where kind = 'zindan' and ref = 7;
update battle_rewards set ref = 9 where kind = 'zindan' and ref = 6;
update battle_rewards set ref = 6 where kind = 'zindan' and ref = 5;
update battle_rewards set ref = 5 where kind = 'zindan' and ref = 4;
-- seçili zindan unvanları da yeni numaraya
update equipment set title = 'zindan:' || case split_part(title, ':', 2)
  when '16' then '50' when '15' then '43' when '14' then '37' when '13' then '33' when '12' then '27' when '11' then '23' when '10' then '19'
  when '9' then '17' when '8' then '14' when '7' then '11' when '6' then '9' when '5' then '6' when '4' then '5' else split_part(title, ':', 2) end
where title like 'zindan:%';
