import { getD1, requireAdmin, jsonError } from "../../../server-auth";
import { normalizeFolderUrl } from "../../../drive-model";
import { sameOrigin } from "../../../server-drive";
export async function GET() {
  try {
    await requireAdmin();
    const users = await getD1().prepare(`SELECT u.id, u.name, d.folder_url AS folderUrl FROM users u LEFT JOIN user_drive_settings d ON d.user_id=u.id WHERE u.active=1 ORDER BY u.name`).all();
    return Response.json({users:users.results},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) { return jsonError(error); }
}
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!sameOrigin(request)) return Response.json({error:"この操作は利用できません"},{status:403});
    const body = await request.json() as {userId?: unknown; folderUrl?: unknown};
    if (typeof body.userId !== "string" || body.folderUrl === undefined) return Response.json({error:"利用者とURLを確認してください"},{status:400});
    let folderUrl;
    try { folderUrl = normalizeFolderUrl(body.folderUrl); } catch(error) { return Response.json({error:(error as Error).message},{status:400}); }
    const db = getD1();
    if (!await db.prepare("SELECT id FROM users WHERE id = ? AND active = 1").bind(body.userId).first()) return Response.json({error:"利用者が見つかりません"},{status:404});
    await db.prepare(`INSERT INTO user_drive_settings (user_id, folder_url, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET folder_url=excluded.folder_url, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`).bind(body.userId, folderUrl, admin.id).run();
    return Response.json({ok:true});
  } catch(error) { return jsonError(error); }
}
