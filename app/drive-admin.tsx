"use client";
import { useEffect, useState } from "react";
type FolderUser={id:string;name:string;folderUrl:string|null};
export function DriveFolderAdmin(){
  const [users,setUsers]=useState<FolderUser[]>([]);const [selected,setSelected]=useState("");const [url,setUrl]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  const load=async()=>{try{const response=await fetch("/api/admin/drive-folders",{cache:"no-store"});if(!response.ok)throw new Error();setUsers((await response.json() as {users:FolderUser[]}).users);}catch{setMessage("保存先一覧を読み込めませんでした。");}};
  useEffect(()=>{void load();},[]);
  return <section className="admin-panel"><h2>利用者ごとのGoogleドライブ保存先</h2><p>会社で作成・共有設定した専用フォルダのURLを登録します。ここではGoogle側の共有権限は変わりません。</p><form className="drive-admin-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage("");try{const response=await fetch("/api/admin/drive-folders",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:selected,folderUrl:url.trim()||null})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error);await load();setMessage("保存先を更新しました。以前の保存完了記録は保持しています。");}catch(e){setMessage(e instanceof Error?e.message:"更新できませんでした");}finally{setBusy(false);}}}>
    <label>利用者<select aria-label="保存先を設定する利用者" value={selected} disabled={busy} onChange={event=>{setSelected(event.target.value);setUrl(users.find(user=>user.id===event.target.value)?.folderUrl||"");setMessage("");}}><option value="">利用者を選んでください</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
    <label>専用フォルダのURL<input aria-label="専用フォルダのURL" type="url" maxLength={1000} value={url} onChange={event=>setUrl(event.target.value)} disabled={busy} placeholder="https://drive.google.com/drive/folders/..." /></label>
    <p>空欄で保存すると保存先の登録を解除します。フォルダや動画、保存完了記録は削除しません。保存先を変更しても、過去に保存した動画は自動では移動しません。</p>
    <button className="primary-button" disabled={!selected||busy}>{busy?"更新中…":"保存先を登録・変更する"}</button>
  </form>{message&&<p role="status">{message}</p>}</section>;
}
