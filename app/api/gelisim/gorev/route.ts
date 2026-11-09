import { jsonOk } from "@/lib/http";
import { withUser } from "@/lib/auth/session";
import { todayIstanbul } from "@/lib/dates";
import { questsToday } from "@/lib/quests-server";

// Günlük görev panosu: bugünkü rutin hedefleri ve kazanılmış, bekleyen hediyeler
export const GET = withUser(async (_req, user) => jsonOk(await questsToday(user.id, todayIstanbul())));
