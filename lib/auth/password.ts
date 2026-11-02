import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummy: Promise<string> | undefined;

/** Kullanıcı bulunamadığında da bcrypt çalıştırılır; böylece yanıt süresi kullanıcı adını ele vermez. */
export async function burnPasswordCheck(password: string): Promise<false> {
  dummy ??= bcrypt.hash("bu-kullanici-yok", COST);
  await bcrypt.compare(password, await dummy);
  return false;
}

/** Yeni şifre kuralları. Sorun yoksa null döner. */
export function checkNewPassword(password: string): string | null {
  if (password.length < 8) return "Yeni şifre en az 8 karakter olmalı.";
  // bcrypt 72 bayttan sonrasını dikkate almaz
  if (new TextEncoder().encode(password).length > 72) return "Yeni şifre çok uzun (en fazla 72 bayt).";
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) || !/\d/.test(password)) {
    return "Yeni şifrede en az bir harf ve bir rakam olmalı.";
  }
  return null;
}
