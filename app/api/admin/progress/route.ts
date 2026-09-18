import { getD1, jsonError, requireAdmin } from "../../../server-auth";

type AdminProgressRow = { id: string; name: string; current_step: number | null; completed_steps: string | null; last_worked_step: number | null; updated_at: string | null };

export async function GET() {
  try {
    await requireAdmin();
    const result = await getD1().prepare(`SELECT u.id, u.name, p.current_step, p.completed_steps, p.last_worked_step, p.updated_at
      FROM users u LEFT JOIN user_progress p ON p.user_id = u.id
      WHERE u.active = 1 AND u.role = 'user'
      ORDER BY COALESCE(p.updated_at, u.created_at) DESC, u.name COLLATE NOCASE`).all<AdminProgressRow>();
    const users = result.results.map((row: AdminProgressRow) => {
      let completed: number[] = [];
      try { completed = JSON.parse(row.completed_steps ?? "[]") as number[]; } catch {}
      return {
        id: row.id,
        name: row.name,
        progressRate: Math.round((completed.length / 6) * 100),
        currentStep: row.current_step ?? 1,
        completedCount: completed.length,
        lastWorkedStep: row.last_worked_step ?? 1,
        updatedAt: row.updated_at,
      };
    });
    return Response.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}
