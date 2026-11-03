-- Ortak sefer, ayrı rutin XP'si ve tek otoriter savaş durumu.
-- version karşılaştırması iki oyuncunun eşzamanlı yazmasını güvenli biçimde sıraya alır.
create table if not exists expedition_campaigns (
  account_id uuid primary key references accounts(id) on delete cascade,
  state jsonb not null,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);
