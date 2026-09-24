import { getD1, jsonError, requireUser } from "../../server-auth";

type ProgressRow = { current_step: number; completed_steps: string; positions: string; checks: string; form_values: string; last_worked_step: number; updated_at: string | null };
const TOTAL_STEPS = 4;

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function serialize(row?: ProgressRow | null) {
  if (!row) return { completed: [], position: {}, checks: {}, form: {}, currentStep: 1, lastWorkedStep: 1, updatedAt: null };
  const completed = parseJson<number[]>(row.completed_steps, []).filter(step => Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS);
  return {
    completed,
    position: parseJson<Record<number, number>>(row.positions, {}),
    checks: parseJson<Record<string, boolean>>(row.checks, {}),
    form: parseJson<Record<string, string>>(row.form_values, {}),
    currentStep: Math.min(TOTAL_STEPS, Math.max(1, row.current_step || 1)),
    lastWorkedStep: Math.min(TOTAL_STEPS, Math.max(1, row.last_worked_step || 1)),
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const row = await getD1().prepare("SELECT current_step, completed_steps, positions, checks, form_values, last_worked_step, updated_at FROM user_progress WHERE user_id = ?").bind(user.id).first<ProgressRow>();
    return Response.json({ progress: serialize(row) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const completed = Array.isArray(body.completed) ? body.completed.filter(v => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= TOTAL_STEPS) : [];
    const currentStep = Math.min(TOTAL_STEPS, Math.max(1, Number(body.currentStep) || 1));
    const lastWorkedStep = Math.min(TOTAL_STEPS, Math.max(1, Number(body.lastWorkedStep) || currentStep));
    const position = body.position && typeof body.position === "object" ? body.position : {};
    const checks = body.checks && typeof body.checks === "object" ? body.checks : {};
    const form = body.form && typeof body.form === "object" ? body.form : {};
    const payloads = [completed, position, checks, form].map(value => JSON.stringify(value));
    if (payloads.some(value => value.length > 100_000)) return Response.json({ error: "保存内容が大きすぎます" }, { status: 413 });
    await getD1().prepare(`INSERT INTO user_progress (user_id, current_step, completed_steps, positions, checks, form_values, last_worked_step, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET current_step=excluded.current_step, completed_steps=excluded.completed_steps, positions=excluded.positions, checks=excluded.checks, form_values=excluded.form_values, last_worked_step=excluded.last_worked_step, updated_at=CURRENT_TIMESTAMP`)
      .bind(user.id, currentStep, payloads[0], payloads[1], payloads[2], payloads[3], lastWorkedStep).run();
    return Response.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    return jsonError(error);
  }
}
