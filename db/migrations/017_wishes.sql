-- Dilek Dolabı: gerçek hayatta almak istediğin ödüller ve onları kazandıran görevler.
-- Görev başlatılınca süre işler (start_day); koşullar yalnız o aralıktaki kayıtlarla sayılır.
-- Görevdeyken koşullar değiştirilemez. Ortak dilekte koşulları ikiniz de ayrı ayrı tamamlarsınız.
create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  brand text not null default '' check (char_length(brand) <= 60),
  category text not null check (char_length(category) between 1 and 20),
  tier text not null check (tier in ('yaygin', 'nadir', 'destansi', 'efsanevi')),
  price integer check (price is null or price between 0 and 10000000),
  link text not null default '' check (char_length(link) <= 500),
  note text not null default '' check (char_length(note) <= 300),
  photo text check (photo is null or char_length(photo) <= 200),
  shared boolean not null default false,
  goals jsonb not null,
  days integer not null check (days between 7 and 120),
  status text not null default 'dilek' check (status in ('dilek', 'gorevde', 'kazanildi', 'alindi')),
  start_day date,
  attempts integer not null default 0,
  earned_at timestamptz,
  claimed_at timestamptz,
  gift_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wishes_user_idx on wishes (user_id);
