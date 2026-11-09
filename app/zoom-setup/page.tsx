import { notFound } from "next/navigation";
import { getSessionUser } from "../server-auth";
import ZoomSetupClient from "./setup-client";
export default async function ZoomSetupPage(){
  if ((await getSessionUser())?.role !== "admin") notFound();
  return <main style={{padding:32,maxWidth:1000,margin:"auto"}}><h1>ズーム動画1本の登録・照合</h1><p>利用者情報・PIN・進捗は変更しません。既存の動画や素材は上書きしません。</p><ZoomSetupClient /></main>;
}
