"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { PROGRESS_CLIENT, PROGRESS_CLIENT_HEADER } from "./progress-protocol";
import { emptyDrive, type DriveData } from "./drive-model";

export function useDriveSave(userId?: string, readOnly = false) {
  const [data,setData] = useState<DriveData>(emptyDrive);
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const queue = useRef(Promise.resolve(true));
  const pending = useRef<Record<string,boolean>>({});
  const revision=useRef("");const blocked=useRef(false);
  const owner = useRef(userId); owner.current=userId;
  const key = userId ? `sns-manual-drive-v1:${process.env.NEXT_PUBLIC_REVIEW_MODE === "true" ? "review:" : ""}${userId}` : "";
  const remember=()=>{try{const previous=localStorage.getItem(key);if(Object.keys(pending.current).length){if(previous){let old:{client?:string;baseRevision?:string};try{old=JSON.parse(previous);}catch{old={};}if(old.client!==PROGRESS_CLIENT||old.baseRevision!==revision.current)localStorage.setItem(key+":retained:"+Date.now(),previous);}localStorage.setItem(key,JSON.stringify({client:PROGRESS_CLIENT,baseRevision:revision.current,checks:pending.current}));}else localStorage.removeItem(key);}catch{}};
  useEffect(()=>{
    let active=true; setReady(false); setData(emptyDrive); setError(""); pending.current={};revision.current="";blocked.current=false;
    if(!userId)return;
    try{if(localStorage.getItem(key))setError("この端末の未保存記録は保管しています。最新の記録へ自動反映しません。");}catch{}
    void fetch("/api/drive",{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error(); const result=await response.json() as {drive:DriveData;revision:string}; if(active){revision.current=result.revision;setData(result.drive);setReady(true);if(Object.keys(pending.current).length)setError("保存待ちのチェックがあります。「再試行」を押してください。");}}).catch(()=>{if(active)setError("Googleドライブの保存設定を読み込めませんでした。ページを再読み込みしてください。");});
    return()=>{active=false;};
  },[userId,key]);
  const saveCheck = (contentId:string,saved:boolean):Promise<boolean> => {
    if(readOnly || blocked.current || !userId || !ready)return Promise.resolve(false);
    pending.current[contentId]=saved; remember(); setBusy(true);setError("");
    const result=queue.current.then(async()=>{
      try {
        if(blocked.current)return false;
        const response=await fetch("/api/drive",{method:"PUT",headers:{"Content-Type":"application/json",[PROGRESS_CLIENT_HEADER]:PROGRESS_CLIENT,"If-Match":revision.current},body:JSON.stringify({contentId,saved}),keepalive:true});
        const body=await response.json() as {error?:string;revision?:string};
        if(!response.ok){if([401,412,426,428].includes(response.status))blocked.current=true;throw new Error(body.error||"保存できませんでした");}
        if(body.revision)revision.current=body.revision;
        if(owner.current!==userId)return false;
        setData(current=>({...current,checks:{...current.checks,[contentId]:saved}}));
        if(pending.current[contentId]===saved)delete pending.current[contentId]; remember();return true;
      } catch(e) {if(owner.current===userId)setError(e instanceof Error?e.message:"保存できませんでした");return false;}
      finally {if(owner.current===userId)setBusy(false);}
    });
    queue.current=result;return result;
  };
  const flush=async()=>{
    if(readOnly)return true;
    if(blocked.current)return false;
    await queue.current;
    for(const [id,value] of Object.entries(pending.current)) if(!await saveCheck(id,value))return false;
    return Object.keys(pending.current).length===0;
  };
  return {data,ready,busy,error,saveCheck,flush};
}
type DriveContextValue = {folderUrl:string|null;ready:boolean;busy:boolean;error:string;retry:()=>void};
export const DriveContext=createContext<DriveContextValue>({folderUrl:null,ready:false,busy:false,error:"",retry:()=>{}});
export function DrivePanel() {
  const drive=useContext(DriveContext);
  return <section className="drive-panel"><h4>完成したMP4をGoogleドライブに保存しよう</h4><ol><li>編集した動画をMP4形式で書き出します。</li><li>下のボタンから自分のフォルダを開き、動画をアップロードします。</li><li>アップロードが終わり、動画が保存されていることを確認してからチェックします。</li></ol>
    {!drive.ready ? <p>保存先を読み込んでいます。読み込めない場合はページを再読み込みしてください。</p> : drive.folderUrl ? <><a className="primary-button" href={drive.folderUrl} target="_blank" rel="noopener noreferrer">自分のGoogleドライブフォルダを開く ↗</a><p>別の画面で開きます。自分のGoogleアカウントで操作してください。</p></> : <p className="material-pending">保存先は準備中です。見本動画を見たり、素材をダウンロードして編集の練習をしたりできます。保存先が設定されるまで、保存完了チェックは付けられません。Step5・Step6では、次の動画へ進むこともできません。職員に確認してください。</p>}
    <p>このチェックは自己申告です。マニュアルから自動アップロードは行いません。</p>
    {drive.busy && <p role="status">保存完了チェックを記録しています…</p>}
    {drive.error && <p role="alert">{drive.error} <button type="button" onClick={drive.retry} disabled={drive.busy}>再試行</button></p>}
  </section>;
}
