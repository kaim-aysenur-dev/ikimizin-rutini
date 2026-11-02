-- Yüz yogası: tamamlanan seanslar. Egzersiz ve rutinlerin kendisi kodda (lib/face-yoga-shared.ts).
-- Yalnızca yeni tablo; mevcut verilere dokunulmaz.

create table if not exists face_yoga_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  day date not null,
  routine text not null check (char_length(routine) between 1 and 40),  -- rutin ya da tek egzersiz kimliği
  seconds int not null check (seconds between 10 and 7200),
  created_at timestamptz not null default now()
);
create index if not exists face_yoga_sessions_user_day_idx on face_yoga_sessions (user_id, day);
