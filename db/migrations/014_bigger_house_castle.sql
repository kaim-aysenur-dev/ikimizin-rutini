-- Gelişim: ev 2 kat büyüdü (20x14 -> 28x20), bahçe kuzeye şato için 14 kare uzadı (36x26 -> 36x40).
-- Ev eşyaları kendi odalarında, oda köşesine göre aynı konuma taşınır (eşyalar tek odada durur; sol üst kare odayı belirler).
-- Eski oda köşeleri -> yeni: hol (0,0)->(0,0), salon (6,0)->(8,0), yatak (14,0)->(20,0),
-- mutfak (0,6)->(0,8), banyo (6,8)->(8,11), çalışma (10,8)->(14,11).
update placed_items set
  tx = tx + case
    when tx < 6 then 0                       -- hol, mutfak
    when tx < 14 and ty < 8 then 2           -- salon
    when ty < 8 then 6                       -- yatak
    when tx < 10 then 2                      -- banyo
    else 4                                   -- çalışma
  end,
  ty = ty + case
    when tx < 6 and ty >= 6 then 2           -- mutfak
    when tx >= 6 and ty >= 8 then 3          -- banyo, çalışma
    else 0
  end
where scope = 'oda';

-- Bahçedeki her şey 14 kare güneye (şatonun önü boşalır)
update placed_items set ty = ty + 14 where scope = 'bahce';

-- Canlı konumlar eski düzene göre; temizlenir (yarım saniyede yeniden yazılır)
delete from garden_presence;
