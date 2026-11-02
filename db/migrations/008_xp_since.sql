-- Seviye sıfırlama: doluysa XP ve rozet sayaçları yalnız bu andan sonraki kayıtlardan hesaplanır.
-- Rutin geçmişi silinmez; null yapılınca eski seviye geri gelir.
alter table users add column if not exists xp_since timestamptz;
