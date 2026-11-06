import { getSessionUser } from "../../../server-auth";
import { mediaBindings } from "../../../media-bindings";
import { mediaError, serveMedia, type MediaStore } from "../../../media-response";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const bucket = mediaBindings().MEDIA;
  const store: MediaStore | undefined = bucket ? {
    head: key => bucket.head(key),
    read: async (key, offset, length) => (await bucket.get(key, { range: { offset, length } }))?.body ?? null,
  } : undefined;
  try { return await serveMedia(request, (await params).id, async () => !!await getSessionUser(), store); }
  catch { return mediaError(503, "素材を読み込めませんでした。時間をおいて試してください。"); }
}
export const HEAD = GET;
