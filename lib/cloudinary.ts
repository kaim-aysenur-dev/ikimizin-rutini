import "server-only";
import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

// Fotoğraflar "authenticated" türünde yüklenir: adresler imzasız açılamaz,
// imzalı adresleri yalnızca sunucu üretir ve sadece fotoğrafın sahibine verir.
// Dosya yolu: users/<user_id>/<tür>/<rastgele>

export const UPLOAD_KINDS = ["avatar", "urun", "cilt"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

let configured = false;

function client() {
  if (!configured) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary ortam değişkenleri eksik");
    }
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function folderFor(userId: string, kind: UploadKind): string {
  return `users/${userId}/${kind}`;
}

/** Tarayıcının doğrudan Cloudinary'ye yükleyebilmesi için imza. API Secret burada kalır. */
export function signUpload(userId: string, kind: UploadKind) {
  const c = client();
  const folder = folderFor(userId, kind);
  const params = {
    public_id: `${folder}/${randomBytes(16).toString("hex")}`,
    asset_folder: folder,
    type: "authenticated",
    timestamp: Math.round(Date.now() / 1000),
  };
  const signature = c.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return {
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  };
}

/** İstemciden gelen public_id'nin bu kullanıcıya ve türe ait olduğunu doğrular. */
export function ownsPublicId(userId: string, kind: UploadKind, publicId: unknown): publicId is string {
  return (
    typeof publicId === "string" &&
    new RegExp(`^${folderFor(userId, kind)}/[a-f0-9]{32}$`).test(publicId)
  );
}

// blackBg: siyah zeminli ürün fotoğraflarında zemini saydam yapar (kutunun beyazı görünür).
// shortcut: renk tabanlı, ürünün kendisindeki saf siyah da silinir; siyah ürün çıkarsa zemini yükleme anında temizle.
type ImageOptions = { width: number; height?: number; crop?: "fill" | "limit" | "fit"; gravity?: "auto" | "face"; blackBg?: boolean };

/** Fotoğraf için imzalı, boyutlandırılmış adres */
export function imageUrl(publicId: string, { width, height, crop = "limit", gravity, blackBg }: ImageOptions): string {
  return client().url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    transformation: [
      ...(blackBg ? [{ effect: "make_transparent:8", color: "black" }] : []),
      { width, height, crop, gravity, fetch_format: "auto", quality: "auto" },
    ],
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await client().uploader.destroy(publicId, { type: "authenticated", invalidate: true });
  } catch {
    // Silinemeyen eski fotoğraf işlemi durdurmasın
  }
}
