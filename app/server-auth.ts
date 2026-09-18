import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sns_manual_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = { id: string; name: string; role: "user" | "admin" };

export function getD1() {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function newId() {
  return crypto.randomUUID();
}

export async function hashPin(pin: string, saltBase64: string) {
  const salt = Uint8Array.from(atob(saltBase64), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export function newPinSalt() {
  return bytesToBase64(randomBytes(16));
}

async function hashToken(token: string) {
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

export async function createSession(userId: string) {
  const token = bytesToBase64(randomBytes(32));
  const tokenHash = await hashToken(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await getD1().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, userId, expiresAt).run();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getD1().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(token)).run();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await getD1().prepare(`SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).bind(await hashToken(token), now).first<SessionUser>();
  return row ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return user;
}

export function jsonError(error: unknown) {
  if (error instanceof Response) return Response.json({ error: error.status === 401 ? "ログインが必要です" : "権限がありません" }, { status: error.status });
  console.error(error);
  return Response.json({ error: "処理に失敗しました。少し待ってからもう一度お試しください。" }, { status: 500 });
}
