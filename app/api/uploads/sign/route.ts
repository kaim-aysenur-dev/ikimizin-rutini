import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { UPLOAD_KINDS, signUpload, type UploadKind } from "@/lib/cloudinary";

// Tarayıcı fotoğrafı doğrudan Cloudinary'ye yükler; bu route sadece imzayı verir.
// Dosya yolu her zaman oturumdaki kullanıcının klasörüdür: users/<user_id>/<tür>/<rastgele>
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  const kind = body?.kind;
  if (!UPLOAD_KINDS.includes(kind as UploadKind)) return jsonError(400, "Geçersiz yükleme türü.");
  return jsonOk(signUpload(user.id, kind as UploadKind));
});
