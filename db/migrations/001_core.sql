-- Kullanıcılar, oturumlar ve giriş denemeleri

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username)),
  email text unique check (email is null or email = lower(email)),
  display_name text not null,
  avatar_public_id text,
  password_hash text not null,
  must_change_password boolean not null default true,
  -- cilt günlüğünde takip edilen ölçütler (kuruluk, yaglanma, sivilce, hassasiyet, tiras)
  skin_metrics text[] not null default array['kuruluk', 'yaglanma', 'sivilce', 'hassasiyet'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Çerezdeki rastgele oturum kimliğinin SHA-256 özeti saklanır, kendisi saklanmaz.
create table if not exists sessions (
  id text primary key,
  user_id uuid not null references users (id) on delete cascade,
  remember boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

create table if not exists login_attempts (
  id bigserial primary key,
  identifier text not null,
  ip text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_identifier_idx on login_attempts (identifier, at);
create index if not exists login_attempts_ip_idx on login_attempts (ip, at);
