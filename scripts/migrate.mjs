// db/migrations/*.sql dosyalarını sırayla, her biri kendi işleminde (transaction) uygular.
// Kullanım: npm run db:migrate   (DATABASE_URL .env.local'dan okunur)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tanımlı değil (.env.local).");
  process.exit(1);
}

const dir = path.resolve("db/migrations");
const client = new Client(url);
await client.connect();

try {
  await client.query(
    "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select version from schema_migrations");
  const applied = new Set(rows.map((r) => r.version));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const text = await readFile(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(text);
      await client.query("insert into schema_migrations (version) values ($1)", [file]);
      await client.query("commit");
      console.log(`uygulandı: ${file}`);
      count++;
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${file} uygulanamadı: ${err.message}`);
    }
  }
  console.log(count ? `${count} migration uygulandı.` : "Veritabanı güncel.");
} finally {
  await client.end();
}
