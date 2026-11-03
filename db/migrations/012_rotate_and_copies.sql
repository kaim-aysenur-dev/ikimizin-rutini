-- Eşyalar döndürülebilir (rot: 0 ya da 1, en ve boy yer değiştirir) ve bir eşyadan birden çok konabilir
-- (kaç tane konabileceğini uygulama sınırlar: halı 10, sandalye 8, ...).
alter table placed_items add column if not exists rot smallint not null default 0 check (rot in (0, 1));
alter table placed_items drop constraint if exists placed_items_user_id_item_id_key;
