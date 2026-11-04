-- Gelişim: bacaklık yuvası (pantolon ve dizlikler ayrı kuşanılır)
alter table equipment add column if not exists legs text check (legs is null or char_length(legs) between 1 and 60);
