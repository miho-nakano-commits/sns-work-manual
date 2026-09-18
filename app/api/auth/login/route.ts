import { createSession, getD1, hashPin, jsonError } from "../../../server-auth";

type LoginRow = { id: string; name: string; role: "user" | "admin"; pin_salt: string; pin_hash: string; failed_attempts: number; locked_until: number | null };

export async function POST(request: Request) {
  try {
    const { userId, pin } = await request.json() as { userId?: string; pin?: string };
    if (!userId || !/^\d{4}$/.test(pin ?? "")) return Response.json({ error: "利用者名を選び、4桁のPINを入力してください" }, { status: 400 });
    const db = getD1();
    const user = await db.prepare("SELECT id, name, role, pin_salt, pin_hash, failed_attempts, locked_until FROM users WHERE id = ? AND active = 1").bind(userId).first<LoginRow>();
    if (!user) return Response.json({ error: "利用者名またはPINが違います" }, { status: 401 });
    const now = Math.floor(Date.now() / 1000);
    if (user.locked_until && user.locked_until > now) return Response.json({ error: "入力回数が多いため、15分後にもう一度お試しください" }, { status: 429 });
    const valid = (await hashPin(pin!, user.pin_salt)) === user.pin_hash;
    if (!valid) {
      const attempts = user.failed_attempts + 1;
      const lockedUntil = attempts >= 5 ? now + 15 * 60 : null;
      await db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").bind(attempts >= 5 ? 0 : attempts, lockedUntil, user.id).run();
      return Response.json({ error: attempts >= 5 ? "入力回数が多いため、15分間ロックしました" : "利用者名またはPINが違います" }, { status: 401 });
    }
    await db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").bind(user.id).run();
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    return jsonError(error);
  }
}
