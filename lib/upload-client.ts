// Tarayıcıdan Cloudinary'ye imzalı yükleme. API Secret hiçbir zaman tarayıcıya gelmez:
// imzayı sunucu üretir, tarayıcı yalnızca imzalı parametrelerle dosyayı gönderir.
import { api } from "./api-client";

type Signature = {
  public_id: string;
  asset_folder: string;
  type: string;
  timestamp: number;
  signature: string;
  apiKey: string;
  uploadUrl: string;
};

/** Büyük telefon fotoğraflarını yüklemeden önce küçültür (en uzun kenar maxSide). */
async function downscale(file: File, maxSide: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("dönüştürülemedi"))), "image/jpeg", 0.86),
    );
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, kind: "avatar" | "urun" | "cilt", maxSide = 1600): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Lütfen bir fotoğraf seç.");
  const [blob, sig] = await Promise.all([downscale(file, maxSide), api<Signature>("/api/uploads/sign", { body: { kind } })]);
  if (blob.size > 10 * 1024 * 1024) throw new Error("Fotoğraf çok büyük (en fazla 10 MB).");

  const form = new FormData();
  form.append("file", blob, "foto.jpg");
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("public_id", sig.public_id);
  form.append("asset_folder", sig.asset_folder);
  form.append("type", sig.type);

  let res: Response;
  try {
    res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  } catch {
    throw new Error("Fotoğraf yüklenemedi. Bağlantını kontrol et.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.public_id) throw new Error("Fotoğraf yüklenemedi. Tekrar dene.");
  return data.public_id as string;
}
