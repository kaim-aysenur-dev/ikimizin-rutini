-- Gelişim · Çalışma odası: masadaki çalışma alanları (Python, Network...), kitaplıktaki okuma listesi,
-- süre/sayfa kayıtları ve çalışan sayaçlar. Yalnızca yeni tablolar; mevcut verilere dokunulmaz.
-- shared: ortak alan/kitap, aynı hesaptaki iki profil de görür ve kayıt ekler.
-- Silinen alan ve kitap arşivlenir; geçmiş kayıtlar (ve XP'si) kalır.

create table if not exists study_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'pm' check (color in ('pm', 'am', 'bad', 'shower', 'ok', 'week')),
  daily_minutes smallint check (daily_minutes is null or daily_minutes between 5 and 720),
  shared boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists study_areas_user_idx on study_areas (user_id);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  author text not null default '' check (char_length(author) <= 120),
  kind text not null default 'kitap' check (kind in ('kitap', 'yayin')),
  total_pages int check (total_pages is null or total_pages between 1 and 20000),
  current_page int not null default 0 check (current_page between 0 and 20000),
  note text not null default '' check (char_length(note) <= 500),  -- "nerede kaldım"
  status text not null default 'okunuyor' check (status in ('okunacak', 'okunuyor', 'bitti')),
  shared boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_user_idx on books (user_id);

-- Her çalışma ya da okuma oturumu. together: diğer profil de o sırada çalışıyordu (XP +%50).
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  area_id uuid references study_areas (id) on delete cascade,
  book_id uuid references books (id) on delete cascade,
  day date not null,
  minutes smallint not null default 0 check (minutes between 0 and 720),
  pages int not null default 0 check (pages between 0 and 5000),
  together boolean not null default false,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists study_sessions_user_day_idx on study_sessions (user_id, day);

-- Çalışan sayaç: kişi başına bir tane; diğer profil canlı görür
create table if not exists study_timers (
  user_id uuid primary key references users (id) on delete cascade,
  area_id uuid references study_areas (id) on delete cascade,
  book_id uuid references books (id) on delete cascade,
  started_at timestamptz not null default now()
);
