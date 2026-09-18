import { clearSession, jsonError } from "../../../server-auth";

export async function POST() {
  try {
    await clearSession();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
