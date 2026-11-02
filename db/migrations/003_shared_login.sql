-- Tek ortak giriş: bir hesap (kullanıcı adı + şifre), altında kişi profilleri (users).
-- Veriler yine profil (user_id) bazında ayrıdır; oturum hangi profilin seçili olduğunu tutar.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username)),
  email text unique check (email is null or email = lower(email)),
  password_hash text not null,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists account_id uuid references accounts (id) on delete cascade;
create index if not exists users_account_idx on users (account_id);

-- Giriş bilgileri artık hesapta
alter table users drop column if exists password_hash;
alter table users drop column if exists must_change_password;
alter table users drop column if exists email;

-- Oturumlar hesaba bağlı; profil (user_id) girişten sonra seçilir
delete from sessions;
alter table sessions add column if not exists account_id uuid not null references accounts (id) on delete cascade;
alter table sessions alter column user_id drop not null;
create index if not exists sessions_account_idx on sessions (account_id);
