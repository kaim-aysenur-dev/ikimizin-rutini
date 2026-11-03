import { withUser } from "@/lib/auth/session";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { ExpeditionError, parseCommand, readCampaign, updateCampaign } from "@/lib/expedition-server";

export const GET = withUser(async (_req, user) => {
  try { return jsonOk({ campaign: await readCampaign(user.accountId), serverTime: Date.now() / 1000 }); }
  catch (err) { if (err instanceof ExpeditionError) return jsonError(err.status, err.message); throw err; }
});
export const POST = withUser(async (req, user) => {
  const command = parseCommand(await readJson(req));
  if (!command) return jsonError(400, "Geçersiz sefer komutu.");
  try { return jsonOk({ campaign: await updateCampaign(user, command), serverTime: Date.now() / 1000 }); }
  catch (err) { if (err instanceof ExpeditionError) return jsonError(err.status, err.message); throw err; }
});
