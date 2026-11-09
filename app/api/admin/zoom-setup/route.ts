import { requireAdmin } from "../../../server-auth";
import { mediaBindings } from "../../../media-bindings";
import { ZOOM_GUIDE_ASSET } from "../../../media-catalog";
import { mediaError } from "../../../media-response";
import { ZOOM_SETUP_BYTES, ZOOM_SETUP_EXPIRY, ZOOM_SETUP_SHA256 } from "../../../zoom-setup-config";

export async function PUT(request: Request) {
  if (Date.now() > Date.parse(ZOOM_SETUP_EXPIRY)) return mediaError(410, "登録期間は終了しました");
  try { await requireAdmin(); } catch (error) { return mediaError(error instanceof Response ? error.status : 503, "管理者のログインが必要です"); }
  if (request.headers.get("Origin") !== new URL(request.url).origin || request.headers.get("Sec-Fetch-Site") === "cross-site") return mediaError(403, "Origin mismatch");
  if (!request.body || request.headers.get("Content-Length") !== String(ZOOM_SETUP_BYTES) || request.headers.get("Content-Type") !== "video/mp4") return mediaError(400, "指定された動画1本だけを登録できます");
  const bucket = mediaBindings().MEDIA;
  if (!bucket) return mediaError(503, "素材保存先は未設定です");
  const key = ZOOM_GUIDE_ASSET.path.slice(1);
  try {
    if (await bucket.head(key)) return mediaError(409, "登録済みの動画は上書きしません");
    const digest = Uint8Array.from(ZOOM_SETUP_SHA256.match(/../g)!, value => parseInt(value, 16));
    const stored = await bucket.put(key, request.body, {onlyIf:{etagDoesNotMatch:"*"},sha256:digest.buffer,httpMetadata:{contentType:"video/mp4"},customMetadata:{sha256:ZOOM_SETUP_SHA256}});
    return stored ? new Response(null,{status:201,headers:{"Cache-Control":"no-store"}}) : mediaError(409,"登録済みの動画は上書きしません");
  } catch { return mediaError(400,"動画を登録できませんでした。処理を止めて確認してください"); }
}
