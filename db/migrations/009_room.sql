-- Gelişim: oda ve ortak bahçe. Seviyeyle açılan eşyalar envanterden karelere yerleştirilir.
-- scope 'oda': kişinin kendi odası; 'bahce': hesabın ortak bahçesi (yerleştiren kişiye ait).
create table if not exists placed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 40),
  scope text not null check (scope in ('oda', 'bahce')),
  tx smallint not null check (tx between 0 and 40),
  ty smallint not null check (ty between 0 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists placed_items_user_idx on placed_items (user_id, scope);

-- Bahçede canlı konum: yürürken birkaç saniyede bir güncellenir, eski kayıtlar görünmez sayılır.
create table if not exists garden_presence (
  user_id uuid primary key references users (id) on delete cascade,
  x real not null,
  y real not null,
  dir smallint not null default 1,
  moving boolean not null default false,
  updated_at timestamptz not null default now()
);
