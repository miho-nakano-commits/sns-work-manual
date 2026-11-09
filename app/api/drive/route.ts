import { getD1, requireUser, jsonError } from "../../server-auth";
import { readDriveSnapshot, sameOrigin } from "../../server-drive";
import { DRIVE_CONTENT_IDS } from "../../drive-model";
import { PROGRESS_CLIENT, PROGRESS_CLIENT_HEADER } from "../../progress-protocol";
export async function GET(){try{const user=await requireUser();const snapshot=await readDriveSnapshot(user.id);return Response.json({drive:snapshot.drive,revision:snapshot.revision},{headers:{"Cache-Control":"private, no-store",ETag:snapshot.revision}});}catch(error){return jsonError(error);}}
export async function PUT(request:Request){try{
 const user=await requireUser();
 if(request.headers.get(PROGRESS_CLIENT_HEADER)!==PROGRESS_CLIENT)return Response.json({error:"画面を更新してください。古い画面からは保存できません。"},{status:426});
 if(!sameOrigin(request))return Response.json({error:"この操作は利用できません"},{status:403});
 const expected=request.headers.get("If-Match");if(!expected)return Response.json({error:"最新の保存記録を読み込んでください"},{status:428});
 const body=await request.json() as {contentId?:unknown;saved?:unknown;userId?:unknown};
 if(body.userId!==undefined||typeof body.contentId!=="string"||!(DRIVE_CONTENT_IDS as readonly string[]).includes(body.contentId)||typeof body.saved!=="boolean")return Response.json({error:"保存内容を確認してください"},{status:400});
 const snapshot=await readDriveSnapshot(user.id);
 const conflict=()=>Response.json({error:"別の画面で保存記録が変わりました。未保存の内容は端末に保管しています。画面を更新して確認してください。"},{status:412});
 if(expected!==snapshot.revision)return conflict();
 const old=snapshot.records.find(row=>row.content_id===body.contentId);
 if(old&&old.saved===(body.saved?1:0))return Response.json({ok:true,revision:snapshot.revision,unchanged:true});
 if(body.saved&&!snapshot.folder?.folder_url)return Response.json({error:"保存先は準備中です。職員に確認してください"},{status:409});
 const updatedAt=new Date().toISOString();const db=getD1();
 const result=old?await db.prepare("UPDATE drive_save_progress SET saved=?,updated_at=? WHERE user_id=? AND content_id=? AND saved IS ? AND updated_at IS ? AND (?=0 OR EXISTS (SELECT 1 FROM user_drive_settings WHERE user_id=? AND folder_url IS NOT NULL))").bind(body.saved?1:0,updatedAt,user.id,body.contentId,old.saved,old.updated_at,body.saved?1:0,user.id).run():await db.prepare("INSERT INTO drive_save_progress (user_id,content_id,saved,updated_at) SELECT ?,?,?,? WHERE ?=0 OR EXISTS (SELECT 1 FROM user_drive_settings WHERE user_id=? AND folder_url IS NOT NULL) ON CONFLICT(user_id,content_id) DO NOTHING").bind(user.id,body.contentId,body.saved?1:0,updatedAt,body.saved?1:0,user.id).run();
 if(Number(result.meta.changes)!==1)return conflict();
 return Response.json({ok:true,revision:(await readDriveSnapshot(user.id)).revision});
}catch(error){return jsonError(error);}}
