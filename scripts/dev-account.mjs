// Yalnızca yerel doğrulama için geçici "deneme" hesabı (iki profilli: biri örnek cilt verili, biri boş).
//   npm run dev:account -- olustur   Hesabı açar; şifre .env.local'a DENEME_SIFRE olarak yazılır, ekrana basılmaz.
//   npm run dev:account -- sil       Hesabı, profillerini, tüm verisini ve Cloudinary fotoğraflarını siler.
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { Client } from "@neondatabase/serverless";
import { v2 as cloudinary } from "cloudinary";
import { seedSkin } from "./seed/cengiz-cilt.mjs";
import { seedNutrition } from "./seed/cengiz-beslenme.mjs";

const ACCOUNT = "deneme";
const PROFILES = [
  { username: "deneme-a", displayName: "Deneme A", seed: true },
  { username: "deneme-b", displayName: "Deneme B", seed: false },
];
const mode = process.argv[2];
const client = new Client(process.env.DATABASE_URL);
await client.connect();

async function setEnv(key, value) {
  const text = await readFile(".env.local", "utf8");
  const lines = text.split("\n").filter((l) => !l.startsWith(`${key}=`));
  if (value !== null) lines.splice(lines.length - (lines.at(-1) === "" ? 1 : 0), 0, `${key}=${value}`);
  await writeFile(".env.local", lines.join("\n"));
}

async function remove() {
  const { rows } = await client.query(
    "select u.id from users u join accounts a on a.id = u.account_id where a.username = $1",
    [ACCOUNT],
  );
  await client.query("delete from accounts where username = $1", [ACCOUNT]); // profiller ve veriler cascade ile silinir
  await client.query("delete from login_attempts where identifier = $1", [ACCOUNT]);
  if (rows.length) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    for (const r of rows) {
      try {
        await cloudinary.api.delete_resources_by_prefix(`users/${r.id}/`, { type: "authenticated" });
      } catch {}
    }
  }
  return rows.length;
}

try {
  if (mode === "olustur") {
    const password = randomBytes(18).toString("base64url") + "1a";
    await remove();
    await client.query("begin");
    const { rows } = await client.query(
      "insert into accounts (username, password_hash, must_change_password) values ($1, $2, false) returning id",
      [ACCOUNT, await bcrypt.hash(password, 12)],
    );
    for (const p of PROFILES) {
      const res = await client.query(
        "insert into users (account_id, username, display_name, skin_metrics) values ($1, $2, $3, $4) returning id",
        [rows[0].id, p.username, p.displayName, ["kuruluk", "yaglanma", "sivilce", "hassasiyet", "tiras"]],
      );
      if (p.seed) {
        await seedSkin(client, res.rows[0].id);
        await seedNutrition(client, res.rows[0].id);
      }
    }
    await client.query("commit");
    await setEnv("DENEME_SIFRE", password);
    console.log("deneme hesabı hazır (iki profil; şifre .env.local içinde DENEME_SIFRE).");
  } else if (mode === "sil") {
    const n = await remove();
    await setEnv("DENEME_SIFRE", null);
    console.log(n ? "deneme hesabı, profilleri ve verileri silindi." : "deneme hesabı zaten yok.");
  } else {
    console.log("Kullanım: npm run dev:account -- olustur|sil");
  }
} finally {
  await client.end();
}
