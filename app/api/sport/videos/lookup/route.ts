import { jsonError, jsonOk, readJson } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { parseYouTubeId, youtubeWatchUrl } from "@/lib/sport-shared";

// YouTube linkinden video kimliği, başlık ve kanal adı (anahtar gerektirmeyen oEmbed ile).
// YouTube'a ulaşılamazsa başlık boş döner; kullanıcı elle yazar.
export const POST = withUser(async (req) => {
  const body = await readJson(req);
  const youtubeId = typeof body?.url === "string" ? parseYouTubeId(body.url) : null;
  if (!youtubeId) return jsonError(400, "Bu bir YouTube video linki gibi görünmüyor.");

  let title = "";
  let channel = "";
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeWatchUrl(youtubeId))}`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { title?: unknown; author_name?: unknown };
      if (typeof data.title === "string") title = data.title.slice(0, 200);
      if (typeof data.author_name === "string") channel = data.author_name.slice(0, 120);
    } else if (res.status === 401 || res.status === 403 || res.status === 404) {
      return jsonError(404, "Video bulunamadı ya da gizli. Linki kontrol et.");
    }
  } catch {
    // ağ hatası: bilgiler elle girilir
  }
  return jsonOk({ youtubeId, title, channel });
});
