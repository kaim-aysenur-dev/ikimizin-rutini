-- YDS Kampı: sınav hedefi ve günlük kota, aralıklı tekrar kartları (hazır liste + kendi kelimelerin),
-- günlük kart notları, soru çözüm kayıtları ve denemeler.
create table if not exists yds_settings (
  user_id uuid primary key references users (id) on delete cascade,
  exam_date date,
  target integer not null default 70 check (target between 1 and 100),
  daily_words integer not null default 30 check (daily_words between 5 and 300),
  daily_new integer not null default 15 check (daily_new between 0 and 100),
  daily_questions integer not null default 20 check (daily_questions between 0 and 300),
  lock text not null default 'zindan' check (lock in ('kapali', 'zindan', 'sert')),
  updated_at timestamptz not null default now()
);

create table if not exists yds_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  en text not null check (char_length(en) between 1 and 80),
  tr text not null check (char_length(tr) between 1 and 160),
  created_at timestamptz not null default now()
);
create index if not exists yds_words_user_idx on yds_words (user_id);

create table if not exists yds_cards (
  user_id uuid not null references users (id) on delete cascade,
  word_key text not null check (char_length(word_key) between 1 and 120),
  box smallint not null default 0 check (box between 0 and 7),
  due date not null,
  reps integer not null default 0,
  lapses integer not null default 0,
  primary key (user_id, word_key)
);
create index if not exists yds_cards_due_idx on yds_cards (user_id, due);

create table if not exists yds_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  word_key text not null,
  grade smallint not null check (grade between 0 and 3),
  is_new boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists yds_reviews_day_idx on yds_reviews (user_id, day);

create table if not exists yds_practice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  section text not null check (char_length(section) between 1 and 20),
  solved integer not null check (solved between 1 and 500),
  correct integer not null check (correct >= 0 and correct <= solved),
  created_at timestamptz not null default now()
);
create index if not exists yds_practice_day_idx on yds_practice (user_id, day);

create table if not exists yds_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  title text not null default '' check (char_length(title) <= 80),
  sections jsonb not null,
  correct integer not null check (correct between 0 and 80),
  total integer not null check (total between 1 and 80),
  minutes integer check (minutes is null or minutes between 1 and 400),
  created_at timestamptz not null default now()
);
create index if not exists yds_exams_user_idx on yds_exams (user_id, day);
