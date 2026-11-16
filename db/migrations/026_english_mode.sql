-- İngilizce bölümü kişiye göre: YDS'ye hazırlanan (sınav, hedef puan, denemeler) ya da genel İngilizce (kelime + pratik dakikası).
alter table yds_settings add column if not exists mode text not null default 'yds' check (mode in ('yds', 'genel'));
