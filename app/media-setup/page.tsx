import { getSessionUser } from "../server-auth";
import MediaSetupClient from "./setup-client";

export default async function MediaSetupPage() {
  const user = await getSessionUser();
  if (user?.role !== "admin") return <main style={{padding:32}}><h1>素材登録には管理者ログインが必要です</h1><p>マニュアル内の管理者名とPINでログインしてから、この画面を開き直してください。</p><a href="/">ログイン画面へ</a></main>;
  return <main style={{padding:32,maxWidth:900,margin:"auto"}}><h1>公開前の素材登録</h1><p>登録済みの動画・ZIP、24ファイルだけを非公開保存先へ登録します。利用者情報・PIN・進捗は変更しません。</p><MediaSetupClient /></main>;
}
