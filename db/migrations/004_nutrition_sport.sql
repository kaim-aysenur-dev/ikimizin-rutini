-- Beslenme ve spor. Bütün tablolar profil (user_id) ile bağlı; içeriklerin tamamı arayüzden yönetilir.

/* ---------- beslenme ---------- */

-- su hedefi (bardak) ve bardak hacmi
alter table users add column if not exists water_glass_ml int not null default 250 check (water_glass_ml between 50 and 1000);
alter table users add column if not exists water_target int not null default 8 check (water_target between 1 and 40);
alter table users add column if not exists water_target_sport int not null default 10 check (water_target_sport between 1 and 40);

-- Her profilin bir etkin haftalık planı ve istediği kadar şablonu olur
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null default 'Haftalık plan',
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists meal_plans_active_idx on meal_plans (user_id) where not is_template;

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references meal_plans (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = Pazartesi
  meal text not null check (meal in ('kahvalti', 'ara1', 'ogle', 'ara2', 'aksam', 'ara3')),
  items text[] not null default '{}',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (plan_id, weekday, meal)
);
create index if not exists meal_plan_items_user_idx on meal_plan_items (user_id);

create table if not exists meal_checks (
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  meal text not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, day, meal)
);

-- günlük su (bardak) ve kısa not
create table if not exists nutrition_days (
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  water_glasses int not null default 0 check (water_glasses between 0 and 40),
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  weight numeric(5, 2) check (weight between 20 and 400),
  waist numeric(5, 1) check (waist between 20 and 300),
  hip numeric(5, 1) check (hip between 20 and 300),
  chest numeric(5, 1) check (chest between 20 and 300),
  arm numeric(5, 1) check (arm between 5 and 100),
  thigh numeric(5, 1) check (thigh between 10 and 150),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- kurallar, içecek planı gibi başlıklı madde listeleri
create table if not exists nutrition_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  lines text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists nutrition_notes_user_idx on nutrition_notes (user_id, sort_order);

-- alışveriş listesi: otomatik maddelerin işaret durumu ve elle eklenen maddeler (hafta bazında)
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  week_start date not null,
  key text not null,
  label text not null default '',
  manual boolean not null default false,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, week_start, key)
);

/* ---------- spor ---------- */

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  region text not null default '',
  how_to text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exercises_user_idx on exercises (user_id);

-- haftanın günlerine başlık (ör. "Üst vücut")
create table if not exists workout_days (
  user_id uuid not null references users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  title text not null default '',
  primary key (user_id, weekday)
);

create table if not exists workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  exercise_id uuid not null references exercises (id) on delete cascade,
  sets int not null default 3 check (sets between 1 and 20),
  reps text not null default '',
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 0 and 1000),
  rest_seconds int not null default 90 check (rest_seconds between 0 and 900),
  note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists workout_plan_user_idx on workout_plan_items (user_id, weekday, sort_order);

-- yapılan her set ayrı satır
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  exercise_id uuid not null references exercises (id) on delete cascade,
  set_no int not null check (set_no between 1 and 50),
  reps int check (reps is null or reps between 0 and 1000),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 0 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists workout_sets_idx on workout_sets (user_id, exercise_id, day);

-- adım, kardiyo, antrenman tamamlandı
create table if not exists activity_days (
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  steps int check (steps is null or steps between 0 and 200000),
  cardio_minutes int check (cardio_minutes is null or cardio_minutes between 0 and 1440),
  workout_done boolean not null default false,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
