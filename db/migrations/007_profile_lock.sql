-- Profil kilidi: doluysa "Kim kullanıyor?" ekranında bu profil yalnızca şifreyle seçilir.
-- Şifrenin kendisi tutulmaz, bcrypt özeti tutulur. Boş (null) profil kilitsizdir.
alter table users add column if not exists lock_hash text;

