-- Ev katları: eşyalar hangi katta duruyor (0 bodrum, 1 zemin, 2 üst kat, 3 çatı). Eski eşyalar zemin katta kalır.
alter table placed_items add column if not exists floor smallint not null default 1 check (floor between 0 and 3);
