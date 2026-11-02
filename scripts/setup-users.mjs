// Ortak hesap ve kişi profilleri kurulumu / bakımı.
//
//   npm run users:setup
//       Ortak hesabı (yoksa geçici şifreyle) ve iki profili oluşturur, Cengiz'in cilt ürünlerini (yoksa) yükler.
//
//   HESAP_SIFRESI=... npm run users:setup -- --sifre-belirle
//       Ortak hesabın şifresini verilen değerle değiştirir (koda ve repoya yazılmaz), oturumları kapatır.
//
//   npm run users:setup -- --sifirla
//       Yeni geçici şifre üretir ve bir kez yazdırır; ilk girişte değiştirmek zorunlu olur.
//
// Herkese açık kayıt yoktur; hesap yalnızca bu betikle oluşturulur.
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { Client } from "@neondatabase/serverless";
import { PRODUCTS, seedSkin } from "./seed/cengiz-cilt.mjs";
import { seedNutrition } from "./seed/cengiz-beslenme.mjs";

const ACCOUNT = "cengizaysenur";
const PROFILES = [
  {
    username: "cengiz",
    displayName: "Cengiz Kaim",
    skinMetrics: ["kuruluk", "yaglanma", "sivilce", "hassasiyet", "tiras"],
    seedSkin: true,
    seedNutrition: true,
  },
  {
    username: "aysenur",
    displayName: "Ayşenur Arslan",
    skinMetrics: ["kuruluk", "yaglanma", "sivilce", "hassasiyet"],
    seedSkin: false, // ürünleri koda gömülmez; arayüzden eklenir
    seedNutrition: false,
  },
];

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function tempPassword() {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return [group(), group(), group(), group()].join("-");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tanımlı değil (.env.local).");
  process.exit(1);
}

const mode = process.argv[2];
const client = new Client(url);
await client.connect();

async function setPassword(password, mustChange) {
  const res = await client.query(
    "update accounts set password_hash = $1, must_change_password = $2, updated_at = now() where username = $3 returning id",
    [await bcrypt.hash(password, 12), mustChange, ACCOUNT],
  );
  if (!res.rowCount) throw new Error(`"${ACCOUNT}" hesabı yok; önce npm run users:setup çalıştır.`);
  await client.query("delete from sessions where account_id = $1", [res.rows[0].id]);
  await client.query("delete from login_attempts where identifier = $1", [ACCOUNT]);
}

try {
  if (mode === "--sifre-belirle") {
    const password = process.env.HESAP_SIFRESI;
    if (!password) throw new Error("HESAP_SIFRESI ortam değişkeni boş.");
    await setPassword(password, false);
    console.log(`${ACCOUNT} şifresi güncellendi. Açık oturumlar kapatıldı.`);
  } else if (mode === "--sifirla") {
    const password = tempPassword();
    await setPassword(password, true);
    console.log(`${ACCOUNT} için yeni geçici şifre: ${password}`);
    console.log("İlk girişte değiştirilmesi zorunlu. Açık oturumlar kapatıldı.");
  } else {
    await client.query("begin");
    try {
      let { rows } = await client.query("select id from accounts where username = $1", [ACCOUNT]);
      let accountId = rows[0]?.id;
      if (!accountId) {
        const password = tempPassword();
        const res = await client.query(
          "insert into accounts (username, password_hash, must_change_password) values ($1, $2, true) returning id",
          [ACCOUNT, await bcrypt.hash(password, 12)],
        );
        accountId = res.rows[0].id;
        console.log(`+ ortak hesap ${ACCOUNT}  geçici şifre: ${password}`);
      } else {
        console.log(`= ortak hesap ${ACCOUNT} zaten var, şifresine dokunulmadı.`);
      }

      for (const p of PROFILES) {
        ({ rows } = await client.query("select id from users where username = $1", [p.username]));
        let userId = rows[0]?.id;
        if (!userId) {
          const res = await client.query(
            "insert into users (account_id, username, display_name, skin_metrics) values ($1, $2, $3, $4) returning id",
            [accountId, p.username, p.displayName, p.skinMetrics],
          );
          userId = res.rows[0].id;
          console.log(`+ profil ${p.displayName}`);
        } else {
          await client.query("update users set account_id = $1 where id = $2", [accountId, userId]);
          console.log(`= profil ${p.displayName} hesaba bağlı`);
        }
        if (p.seedSkin && (await seedSkin(client, userId))) {
          console.log(`  ${p.displayName}: ${PRODUCTS.length} ürün ve rutin adımları yüklendi.`);
        }
        if (p.seedNutrition && (await seedNutrition(client, userId))) {
          console.log(`  ${p.displayName}: 7 günlük akşam planı, notlar ve su hedefi yüklendi.`);
        }
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }
} finally {
  await client.end();
}
