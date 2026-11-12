-- Gelişim: gündelik kıyafet kombini (giydirme ekranı). Zırh giyilmediğinde dünyadaki karakter bu renklerle görünür,
-- portrede yaka, ruj ve aksesuarlar görünür. data: lib/outfit.ts sanitizeOutfit biçimi.
create table if not exists outfits (
  user_id uuid primary key references users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
