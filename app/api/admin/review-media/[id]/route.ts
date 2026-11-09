import { requireAdmin } from "../../../../server-auth";
import { isReview, reviewBindings } from "../../../../review-config";
import { findMedia } from "../../../../media-catalog";
import { mediaError } from "../../../../media-response";
import manifest from "../../../../../review/media-manifest.json" with { type: "json" };

// Prepared for approved Stage C only. No uploader invokes this automatically.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isReview()) return mediaError(404, "Not found");
  try { await requireAdmin(); } catch (error) { return mediaError(error instanceof Response ? error.status : 503, "準備担当者のログインが必要です"); }
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return mediaError(403, "Origin mismatch");
  const { id } = await params;
  const asset = findMedia(id);
  const expected = (manifest as Record<string, { bytes: number; sha256: string }>)[id];
  if (!asset || !expected) return mediaError(404, "登録対象ではありません");
  if (!request.body || request.headers.get("Content-Length") !== String(expected.bytes)) return mediaError(400, "元ファイルとサイズが一致しません");
  const bucket = reviewBindings().REVIEW_MEDIA;
  if (!bucket) return mediaError(503, "確認用の素材保存先は未設定です");
  try {
    const key = asset.path.slice(1);
    if (await bucket.head(key)) return mediaError(409, "登録済みの素材は上書きしません");
    const digest = Uint8Array.from(expected.sha256.match(/../g)!, value => parseInt(value, 16));
    const result = await bucket.put(key, request.body, {
      onlyIf: { etagDoesNotMatch: "*" }, sha256: digest.buffer,
      httpMetadata: { contentType: asset.type }, customMetadata: { sha256: expected.sha256 },
    });
    if (!result) return mediaError(409, "登録済みの素材は上書きしません");
    return new Response(null, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return mediaError(400, "素材を登録できませんでした。元ファイルの一致と保存先を確認してください"); }
}
