-- Eşyalar dört yöne döner (0 düz, 1 aynalı, 2 ters, 3 ters ve aynalı).
-- Canlı konumda duruş da taşınır: oturan, uzanan ya da masada çalışan diğerini öyle görürsün.
alter table placed_items drop constraint if exists placed_items_rot_check;
alter table placed_items add constraint placed_items_rot_check check (rot between 0 and 3);
alter table garden_presence add column if not exists pose text check (pose is null or length(pose) <= 16);
