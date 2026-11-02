-- Cilt bakımı: ürünler, rutin adımları, günlük işaretler ve cilt günlüğü

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  brand text not null default '',
  image_url text,              -- /public altındaki hazır görsel (ör. /products/foam.webp)
  image_public_id text,        -- Cloudinary'ye yüklenen görsel
  purpose text not null default '',      -- ne için
  area text not null default '',         -- nereye
  duration text not null default '',     -- süre / nasıl
  usage_time text not null default '',   -- ne zaman (serbest metin)
  ingredients text not null default '',  -- içerik notu
  note text not null default '',         -- uyarı / not
  timer_seconds int[] not null default '{}',
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_user_idx on products (user_id, sort_order);

-- Rutindeki her adım. Ürünsüz adım da olabilir (ör. akşam florürlü macun).
create table if not exists routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  product_id uuid references products (id) on delete cascade,
  slot text not null check (slot in ('sabah', 'aksam', 'dus', 'haftalik', 'gerektiginde')),
  label text not null,
  detail text not null default '',
  weekly_target int check (weekly_target is null or weekly_target between 1 and 7),
  timer_seconds int[] not null default '{}',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists routine_items_user_idx on routine_items (user_id, slot, sort_order);
create unique index if not exists routine_items_product_slot_idx
  on routine_items (product_id, slot) where product_id is not null;

create table if not exists checks (
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  item_id uuid not null references routine_items (id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (user_id, day, item_id)
);
create index if not exists checks_item_idx on checks (user_id, item_id, day);

create table if not exists skin_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  kuruluk smallint check (kuruluk between 1 and 5),
  yaglanma smallint check (yaglanma between 1 and 5),
  sivilce smallint check (sivilce between 1 and 5),
  hassasiyet smallint check (hassasiyet between 1 and 5),
  tiras smallint check (tiras between 1 and 5),
  note text not null default '',
  photo_public_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
