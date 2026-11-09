import { env } from "cloudflare:workers";
import { requireUser, type SessionUser } from "./server-auth";
import { isReview } from "./review-config";

// Runtime-only account IDs. No PINs, names, client flags, or persisted role changes.
export function canStaffReview(user: SessionUser | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const bindings = env as unknown as Record<string, unknown>;
  const setting = bindings[isReview() ? "REVIEW_STAFF_REVIEW_USER_IDS" : "STAFF_REVIEW_USER_IDS"];
  if (typeof setting !== "string" || setting.length > 16384) return false;
  try {
    const ids: unknown = JSON.parse(setting);
    if (!Array.isArray(ids) || !ids.every(id => typeof id === "string" && id.length > 0 && id.length <= 128)) return false;
    return ids.includes(user.id);
  } catch { return false; }
}

export async function requireStaffReviewer() {
  const user = await requireUser();
  if (!canStaffReview(user)) throw new Response("Forbidden", { status: 403 });
  return user;
}
