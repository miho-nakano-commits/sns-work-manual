"use client";
import { useState } from "react";
import { ZOOM_SETUP_BYTES, ZOOM_SETUP_SHA256 } from "../zoom-setup-config";
const url="/api/media/zoom-operation-guide";
const hash=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
export default function ZoomSetupClient(){
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[lines,setLines]=useState<string[]>([]),[verified,setVerified]=useState(false);
 const log=(line:string)=>setLines(previous=>[...previous,line]);
 async function run(upload:boolean){setBusy(true);setLines([]);setVerified(false);try{
  if(upload){if(!file||file.size!==ZOOM_SETUP_BYTES||await hash(await file.arrayBuffer())!==ZOOM_SETUP_SHA256)throw Error("選択されたファイルが元のズーム動画と一致しません。送信していません。");log("元動画の容量・SHA-256一致を確認しました。");
   const head=await fetch(url,{method:"HEAD",cache:"no-store"});
   if(head.status===404){const response=await fetch("/api/admin/zoom-setup",{method:"PUT",headers:{"Content-Type":"video/mp4"},body:file});if(response.status!==201)throw Error("登録に失敗しました（"+response.status+"）。処理を停止します。");log("新しい動画1本を登録しました。");}
   else if(head.ok)log("登録済みです。上書きせず照合します。");else throw Error("保存先の確認に失敗しました（"+head.status+"）。");
  }
  const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw Error("読み戻しに失敗しました（"+response.status+"）。");const bytes=await response.arrayBuffer();if(bytes.byteLength!==ZOOM_SETUP_BYTES||await hash(bytes)!==ZOOM_SETUP_SHA256)throw Error("保存した動画の内容が一致しません。処理を停止します。");log("読み戻し：61,812,802バイト・SHA-256一致。");
  for(const start of [0,30_000_000,ZOOM_SETUP_BYTES-64]){const part=await fetch(url,{headers:{Range:`bytes=${start}-${start+63}`},cache:"no-store"});const actual=new Uint8Array(await part.arrayBuffer());const expected=new Uint8Array(bytes,start,64);if(part.status!==206||actual.length!==64||actual.some((value,i)=>value!==expected[i]))throw Error("途中読み取りが一致しません。");}log("先頭・中間・末尾のRange206・内容一致を確認しました。");setVerified(true);log("照合完了。下の動画で再生と途中再生を確認してください。");
 }catch(e){log(e instanceof Error?e.message:"処理に失敗しました。停止します。");}finally{setBusy(false);}}
 return <section><input type="file" accept="video/mp4,.mp4" aria-label="登録するズーム動画" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/><p>{file?.name??"動画を選択してください"}</p><button disabled={busy||!file} onClick={()=>void run(true)}>動画1本を登録して照合</button><button disabled={busy} onClick={()=>void run(false)}>登録済み動画を照合</button><pre role="status" style={{whiteSpace:"pre-wrap"}}>{lines.join("\n")}</pre>{verified&&<video controls playsInline preload="metadata" aria-label="登録したズーム動画" src={url} style={{width:"100%",marginTop:24}}/>}</section>;
}
