import { jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { studyOverview } from "@/lib/study-server";

// Çalışma odası: alanlar, okuma listesi, son 60 günün kayıtları ve çalışan sayaçlar
export const GET = withUser(async (_req, user) => jsonOk(await studyOverview(user, todayIstanbul())));
