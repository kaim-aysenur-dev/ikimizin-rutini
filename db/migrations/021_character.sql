-- Gelişim: karakter görünümü ve binek. Unvan, iz efekti ve binek seçimi; bineğin eyeri ve zırhı (zırh askısından);
-- canlı konumda ruh hâli (rutine göre enerjik, yorgun, uykulu...) ve binmiş mi.
alter table equipment add column if not exists title text check (title is null or char_length(title) between 1 and 60);
alter table equipment add column if not exists trail text check (trail is null or char_length(trail) between 1 and 30);
alter table equipment add column if not exists mount text check (mount is null or char_length(mount) between 1 and 30);
alter table equipment add column if not exists saddle text check (saddle is null or char_length(saddle) between 1 and 60);
alter table equipment add column if not exists barding text check (barding is null or char_length(barding) between 1 and 60);
alter table garden_presence add column if not exists mood text check (mood is null or char_length(mood) between 1 and 20);
