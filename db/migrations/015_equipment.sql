-- Gelişim: kişinin kuşandıkları (şatonun 3. katındaki zırh odalarından seçilir, karakterin üstünde görünür).
create table if not exists equipment (
  user_id uuid primary key references users (id) on delete cascade,
  armor text check (armor is null or char_length(armor) between 1 and 60),
  weapon text check (weapon is null or char_length(weapon) between 1 and 60),
  spells text[] not null default '{}' check (cardinality(spells) <= 4),
  updated_at timestamptz not null default now()
);

-- Canlı konumla birlikte son saldırı ya da büyü (diğer kişi efekti görür)
alter table garden_presence add column if not exists action jsonb;
