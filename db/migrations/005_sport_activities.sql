-- Spor: aktivite türleri, haftalık gün hedefi, YouTube video kütüphanesi ve oturum kaydı.
-- Yalnızca yeni tablolar; mevcut plan, set ve aktivite kayıtlarına dokunulmaz.

-- Her profilin kendi türleri (Pilates, Dans kardiyo, Boks, Ağırlık…)
create table if not exists activity_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  color text not null default 'pm' check (color in ('pm', 'am', 'bad', 'shower', 'ok', 'week')),
  tracks_rounds boolean not null default false,  -- boks gibi: tur sayısı da sorulur
  logs_sets boolean not null default false,      -- ağırlık gibi: setler Set kaydı sayfasında girilir
  archived boolean not null default false,       -- silinen tür arşivlenir, geçmiş oturumlar kalır
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists activity_types_user_idx on activity_types (user_id, sort_order);

-- Haftalık hedef: haftada kaç gün, isteğe bağlı "en az N gün şu tür"
create table if not exists sport_goals (
  user_id uuid primary key references users (id) on delete cascade,
  days_per_week smallint not null check (days_per_week between 1 and 7),
  min_type_id uuid references activity_types (id) on delete set null,
  min_type_days smallint check (min_type_days is null or min_type_days between 1 and 7),
  updated_at timestamptz not null default now()
);

-- YouTube videoları (yalnızca kimlik saklanır; kapak resmi kimlikten üretilir)
create table if not exists sport_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (char_length(title) between 1 and 200),
  channel text not null default '',
  type_id uuid references activity_types (id) on delete set null,
  minutes smallint check (minutes is null or minutes between 1 and 300),
  level text check (level is null or level in ('hafif', 'orta', 'zor')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists sport_videos_active_idx on sport_videos (user_id, youtube_id) where not archived;

-- Yapılan her spor oturumu
create table if not exists sport_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  type_id uuid references activity_types (id) on delete set null,
  video_id uuid references sport_videos (id) on delete set null,
  minutes smallint check (minutes is null or minutes between 1 and 600),
  rounds smallint check (rounds is null or rounds between 1 and 100),
  intensity text check (intensity is null or intensity in ('hafif', 'orta', 'zor')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists sport_sessions_user_day_idx on sport_sessions (user_id, day);
