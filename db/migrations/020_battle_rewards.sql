-- Gelişim: Ay Kapısı zindanı ve gece hayaletleri. Her bölümün ve her hayaletin ödülü günde bir kez alınır;
-- bölümün ilk geçilişi tam XP, sonrakiler daha az. XP toplamına (xp-server) eklenir.
create table if not exists battle_rewards (
  id bigserial primary key,
  user_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('zindan', 'hayalet')),
  ref integer not null check (ref between 0 and 100),
  day date not null,
  xp integer not null check (xp between 0 and 2000),
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref, day)
);
create index if not exists battle_rewards_user on battle_rewards (user_id);
