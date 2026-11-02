import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { isDay, weekStart } from "@/lib/dates";
import { addShoppingItem, deleteShoppingItem, setShoppingChecked, updateShoppingItem } from "@/lib/nutrition";
import { UUID_RE } from "@/lib/skin";
import { text } from "@/lib/validate";

// Otomatik maddeyi işaretle ({week, key, checked}) ya da elle madde ekle ({week, label})
export const POST = withUser(async (req, user) => {
  const body = await readJson(req);
  if (!isDay(body?.week)) return jsonError(400, "Geçersiz hafta.");
  const week = weekStart(body.week);
  if (typeof body?.key === "string" && typeof body?.checked === "boolean") {
    await setShoppingChecked(user.id, week, text(body.key, 200), body.checked);
    return jsonOk({ ok: true });
  }
  const label = text(body?.label, 120);
  if (!label) return jsonError(400, "Madde boş olamaz.");
  return jsonOk({ id: await addShoppingItem(user.id, week, label) }, { status: 201 });
});

// Elle eklenen maddeyi işaretle
export const PATCH = withUser(async (req, user) => {
  const body = await readJson(req);
  if (typeof body?.id !== "string" || !UUID_RE.test(body.id) || typeof body?.checked !== "boolean") {
    return jsonError(400, "Geçersiz istek.");
  }
  if (!(await updateShoppingItem(user.id, body.id, body.checked))) return jsonError(404, "Madde bulunamadı.");
  return jsonOk({ ok: true });
});

export const DELETE = withUser(async (req, user) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !UUID_RE.test(id) || !(await deleteShoppingItem(user.id, id))) return jsonError(404, "Madde bulunamadı.");
  return jsonOk({ ok: true });
});
