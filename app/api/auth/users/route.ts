import { getD1, jsonError } from "../../../server-auth";

export async function GET() {
  try {
    const db = getD1();
    const count = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
    if (!count?.count) return Response.json({ needsSetup: true, users: [] });
    const result = await db.prepare("SELECT id, name, role FROM users WHERE active = 1 ORDER BY role DESC, name COLLATE NOCASE").all();
    return Response.json({ needsSetup: false, users: result.results });
  } catch (error) {
    return jsonError(error);
  }
}
