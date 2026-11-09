import { getD1, jsonError, requireAdmin } from "../../../server-auth";
import { TOTAL_STEPS, normalizeProgress, parseJson, step5CompletedCount, step6CompletedCount, legacySubmissionNumbers } from "../../../progress";
import { driveProgressView } from "../../../drive-model";
import { practiceIds } from "../../../practice-catalog";

type AdminProgressRow = { id: string; name: string; current_step: number | null; completed_steps: string | null; checks: string | null; last_worked_step: number | null; updated_at: string | null };

export async function GET() {
  try {
    await requireAdmin();
    const result = await getD1().prepare(`SELECT u.id, u.name, p.current_step, p.completed_steps, p.checks, p.last_worked_step, p.updated_at
      FROM users u LEFT JOIN user_progress p ON p.user_id = u.id
      WHERE u.active = 1 AND u.role = 'user'
      ORDER BY COALESCE(p.updated_at, u.created_at) DESC, u.name COLLATE NOCASE`).all<AdminProgressRow>();
    const driveRows = await getD1().prepare("SELECT user_id, content_id, saved, updated_at FROM drive_save_progress").all<{user_id:string;content_id:string;saved:number;updated_at:string}>();
    const users = result.results.map((row: AdminProgressRow) => {
      const progress = normalizeProgress({ completed: parseJson(row.completed_steps, []), checks: parseJson(row.checks), currentStep: row.current_step, lastWorkedStep: row.last_worked_step });
      const records=driveRows.results.filter(item=>item.user_id===row.id);
      const driveChecks=Object.fromEntries(records.map(item=>[item.content_id,item.saved===1]));
      const view=driveProgressView(progress,driveChecks);
      return {
        id: row.id,
        name: row.name,
        progressRate: Math.round((progress.completed.length / TOTAL_STEPS) * 100),
        currentStep: progress.currentStep,
        completedCount: progress.completed.length,
        lastWorkedStep: progress.lastWorkedStep,
        step5CompletedCount: step5CompletedCount(progress.checks),
        step6CompletedCount: step6CompletedCount(progress.checks),
        legacySubmissionCount: legacySubmissionNumbers(progress.checks).length,
        driveStep4Saved: driveChecks["step4-first-video"] === true,
        driveStep5Count: practiceIds(5).filter(id=>driveChecks[id]).length,
        driveStep6Count: practiceIds(6).filter(id=>driveChecks[id]).length,
        driveProgressRate: Math.round(view.completed.length / TOTAL_STEPS * 100),
        driveCompletedCount: view.completed.length,
        oldCompleted: progress.completed.filter(id=>id>=4),
        driveUpdatedAt: records.map(item=>item.updated_at).sort().at(-1) ?? null,
        updatedAt: row.updated_at,
      };
    });
    return Response.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}
