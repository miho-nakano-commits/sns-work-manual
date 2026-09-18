import { createSession, getD1, hashPin, jsonError, newPinSalt } from "../../../server-auth";

export async function POST(request: Request) {
  try {
    const { name, pin } = await request.json() as { name?: string; pin?: string };
    const cleanName = name?.trim() ?? "";
    if (!cleanName || cleanName.length > 40 || !/^\d{4}$/.test(pin ?? "")) return Response.json({ error: "管理者名と4桁のPINを入力してください" }, { status: 400 });
    const db = getD1();
    const count = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
    if (count?.count) return Response.json({ error: "初期設定は完了しています" }, { status: 409 });
    const id = "admin";
    const salt = newPinSalt();
    await db.prepare("INSERT INTO users (id, name, pin_salt, pin_hash, role) VALUES (?, ?, ?, ?, 'admin')").bind(id, cleanName, salt, await hashPin(pin!, salt)).run();
    await db.prepare("INSERT INTO user_progress (user_id) VALUES (?)").bind(id).run();
    await createSession(id);
    return Response.json({ user: { id, name: cleanName, role: "admin" } });
  } catch (error) {
    return jsonError(error);
  }
}
