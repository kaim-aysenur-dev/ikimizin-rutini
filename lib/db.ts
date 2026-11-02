import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

/** Neon HTTP istemcisi. Her sorgu tek bir HTTP isteğidir; bağlantı havuzu gerekmez. */
export function sql(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL tanımlı değil");
    client = neon(url);
  }
  return client;
}
