"use client";
import { useState } from "react";
import { MEDIA_ASSETS } from "../media-catalog";
import manifest from "../../review/media-manifest.json" with { type: "json" };

const expected = manifest as Record<string,{bytes:number;sha256:string}>;
const digest = async (data: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",data)),b=>b.toString(16).padStart(2,"0")).join("");
export default function MediaSetupClient() {
  const [files,setFiles] = useState<File[]>([]);
  const [busy,setBusy] = useState(false);
  const [lines,setLines] = useState<string[]>([]);
  const log = (line:string) => setLines(prior=>[...prior,line]);
  async function verify(id:string) {
    const response=await fetch(`/api/media/${id}`,{cache:"no-store"});
    if(!response.ok)throw new Error(`${id}: 読み取り失敗 (${response.status})`);
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==expected[id].bytes || await digest(bytes)!==expected[id].sha256)throw new Error(`${id}: 保存済みの内容が一致しません`);
    const range=await fetch(`/api/media/${id}`,{headers:{Range:"bytes=0-15"},cache:"no-store"});
    if(range.status!==206 || range.headers.get("Content-Range")!==`bytes 0-15/${bytes.byteLength}`)throw new Error(`${id}: 途中読み取りに失敗しました`);
    const start=new Uint8Array(await range.arrayBuffer());
    if(start.length!==16 || start.some((value,i)=>value!==new Uint8Array(bytes)[i]))throw new Error(`${id}: 途中読み取りの内容が不一致です`);
  }
  async function run(upload:boolean) {
    setBusy(true);setLines([]);
    try {
      const matched=new Map<string,File>();
      if(upload){
        // Validate the entire selection before sending any write request.
        for(const file of files){
          const possible=MEDIA_ASSETS.filter(asset=>expected[asset.id].bytes===file.size);
          if(!possible.length)throw new Error(`${file.name}: 登録対象外のファイルです`);
          const hash=await digest(await file.arrayBuffer());
          const asset=possible.find(asset=>expected[asset.id].sha256===hash);
          if(!asset)throw new Error(`${file.name}: 元素材と一致しません`);
          if(matched.has(asset.id))throw new Error(`${file.name}: 同じ素材が重複しています`);
          matched.set(asset.id,file);
        }
        if(matched.size!==MEDIA_ASSETS.length)throw new Error(`24ファイル必要です。現在は${matched.size}ファイルです`);
        log("24ファイルの元データ一致を確認しました。");
      }
      for(const asset of MEDIA_ASSETS){
        if(upload){
          const head=await fetch(`/api/media/${asset.id}`,{method:"HEAD",cache:"no-store"});
          if(head.status===404){
            const response=await fetch(`/api/admin/media/${asset.id}`,{method:"PUT",headers:{"Content-Type":asset.type},body:matched.get(asset.id)!});
            if(response.status!==201 && response.status!==409)throw new Error(`${asset.filename}: 登録失敗 (${response.status})`);
          }else if(!head.ok)throw new Error(`${asset.filename}: 保存先の確認失敗 (${head.status})`);
        }
        await verify(asset.id);log(`一致・途中読み取り確認済み: ${asset.filename}`);
      }
      log("24 / 24 完了。次は動画の実再生を確認します。まだ最新版への切り替えは行っていません。");
    } catch(error){log(error instanceof Error?error.message:"処理に失敗しました。作業を止めて確認してください。");}
    finally{setBusy(false);}
  }
  return <section><p>案内された24ファイルを選択してください。すべて一致した場合だけ登録を開始します。登録済みの素材は上書きせず内容を確認します。</p><input aria-label="登録する素材24ファイル" type="file" accept=".mp4,.zip" multiple disabled={busy} onChange={event=>setFiles(Array.from(event.target.files??[]))}/><p>{files.length}ファイル選択中</p><button disabled={busy||files.length!==24} onClick={()=>void run(true)}>24ファイルを登録して照合</button>{" "}<button disabled={busy} onClick={()=>void run(false)}>保存済み24ファイルを照合</button><pre role="status" aria-live="polite" style={{whiteSpace:"pre-wrap"}}>{lines.join("\n")}</pre></section>;
}
