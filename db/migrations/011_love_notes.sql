-- Posta kutusu: birbirinize bırakılan kısa notlar. read_at boşsa okunmamış (kutuda kalp yanar).
create table if not exists love_notes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references users (id) on delete cascade,
  to_user uuid not null references users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists love_notes_to_idx on love_notes (to_user, created_at desc);
