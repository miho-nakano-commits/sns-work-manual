import { getD1, hashPin, jsonError, newId, newPinSalt, requireAdmin } from "../../../server-auth";

export async function GET() {
  try {
    await requireAdmin();
    const result = await getD1().prepare("SELECT id, name, role, active, created_at FROM users ORDER BY role DESC, name COLLATE NOCASE").all();
    return Response.json({ users: result.results });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { name, pin } = await request.json() as { name?: string; pin?: string };
    const cleanName = name?.trim() ?? "";
    if (!cleanName || cleanName.length > 40 || !/^\d{4}$/.test(pin ?? "")) return Response.json({ error: "利用者名と4桁のPINを入力してください" }, { status: 400 });
    const db = getD1();
    const existing = await db.prepare("SELECT id FROM users WHERE name = ?").bind(cleanName).first();
    if (existing) return Response.json({ error: "同じ名前の利用者が登録されています" }, { status: 409 });
    const id = newId();
    const salt = newPinSalt();
    await db.batch([
      db.prepare("INSERT INTO users (id, name, pin_salt, pin_hash, role) VALUES (?, ?, ?, ?, 'user')").bind(id, cleanName, salt, await hashPin(pin!, salt)),
      db.prepare("INSERT INTO user_progress (user_id) VALUES (?)").bind(id),
    ]);
    return Response.json({ user: { id, name: cleanName, role: "user", active: 1 } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
