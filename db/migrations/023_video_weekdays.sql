-- Spor videoları güne göre ayrılır: bir video birden çok güne ait olabilir (0 = Pazartesi … 6 = Pazar)
alter table sport_videos add column if not exists weekdays smallint[] not null default '{}'
  check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]);
