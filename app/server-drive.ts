import { getD1 } from "./server-auth";
import type { DriveData } from "./drive-model";
import { stableProgress } from "./progress-protocol";
export type DriveRecord={content_id:string;saved:number;updated_at:string};
export async function readDriveSnapshot(userId:string){
  const db=getD1();
  const folder=await db.prepare("SELECT folder_url, updated_at FROM user_drive_settings WHERE user_id = ?").bind(userId).first<{folder_url:string|null;updated_at:string}>();
  const records=(await db.prepare("SELECT content_id, saved, updated_at FROM drive_save_progress WHERE user_id = ? ORDER BY content_id").bind(userId).all<DriveRecord>()).results;
  const bytes=new TextEncoder().encode(stableProgress({userId,folder,records}));
  const revision='"'+Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join('')+'"';
  return {folder,records,revision,drive:{folderUrl:folder?.folder_url??null,checks:Object.fromEntries(records.map(row=>[row.content_id,row.saved===1]))}};
}
export async function readDrive(userId: string): Promise<DriveData> {
  const db = getD1();
  const folder = await db.prepare("SELECT folder_url FROM user_drive_settings WHERE user_id = ?").bind(userId).first<{folder_url: string | null}>();
  const records = await db.prepare("SELECT content_id, saved FROM drive_save_progress WHERE user_id = ?").bind(userId).all<{content_id: string; saved: number}>();
  return {folderUrl: folder?.folder_url ?? null, checks: Object.fromEntries(records.results.map(row => [row.content_id, row.saved === 1]))};
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
