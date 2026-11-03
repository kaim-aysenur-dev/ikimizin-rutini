-- Canlı konum artık yalnız bahçe değil: 'bahce' ya da 'ev:<ev sahibinin kimliği>'
alter table garden_presence add column if not exists place text not null default 'bahce';
