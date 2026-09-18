import { createSession, getD1, hashPin, jsonError } from "../../../server-auth";

type LoginRow = { id: string; name: string; role: "user" | "admin"; pin_salt: string; pin_hash: string; failed_attempts: number; locked_until: number | null };
const LOGIN_ERROR = "氏名またはPINコードが正しくありません。";
const DUMMY_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";

export async function POST(request: Request) {
  try {
    const { name, pin } = await request.json() as { name?: string; pin?: string };
    const cleanName = name?.trim() ?? "";
    if (!cleanName || !/^\d{4}$/.test(pin ?? "")) return Response.json({ error: LOGIN_ERROR }, { status: 400 });
    const db = getD1();
    const user = await db.prepare("SELECT id, name, role, pin_salt, pin_hash, failed_attempts, locked_until FROM users WHERE name = ? AND active = 1").bind(cleanName).first<LoginRow>();
    const now = Math.floor(Date.now() / 1000);
    const suppliedHash = await hashPin(pin!, user?.pin_salt ?? DUMMY_SALT);
    const locked = !!user?.locked_until && user.locked_until > now;
    const valid = !!user && !locked && suppliedHash === user.pin_hash;
    if (!valid) {
      if (user && !locked) {
        const attempts = user.failed_attempts + 1;
        const lockedUntil = attempts >= 5 ? now + 15 * 60 : null;
        await db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").bind(attempts >= 5 ? 0 : attempts, lockedUntil, user.id).run();
      }
      return Response.json({ error: LOGIN_ERROR }, { status: 401 });
    }
    await db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").bind(user.id).run();
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    return jsonError(error);
  }
}
