import { getD1, jsonError } from "../../../server-auth";

export async function GET() {
  try {
    const db = getD1();
    const count = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
    return Response.json({ needsSetup: !count?.count });
  } catch (error) {
    return jsonError(error);
  }
}
