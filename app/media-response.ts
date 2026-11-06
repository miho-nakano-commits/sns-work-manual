import { findMedia } from "./media-catalog";

export type MediaStore = {
  head(key: string): Promise<{ size: number; etag: string } | null>;
  read(key: string, offset: number, length: number): Promise<ReadableStream<Uint8Array> | null>;
};
const secureHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
export const mediaError = (status: number, message: string) => new Response(message, { status, headers: secureHeaders });

export async function serveMedia(request: Request, id: string, authenticate: () => Promise<boolean>, store: MediaStore | undefined) {
  // Authentication happens before asset existence, metadata or range processing.
  if (!await authenticate()) return mediaError(401, "ログインしてください");
  if (!["GET", "HEAD"].includes(request.method)) { const response = mediaError(405, "Method not allowed"); response.headers.set("Allow", "GET, HEAD"); return response; }
  const asset = findMedia(id);
  if (!asset) return mediaError(404, "素材が見つかりません");
  if (!store) return mediaError(503, "素材保存先は未設定です");
  const object = await store.head(asset.path.slice(1));
  if (!object) return mediaError(404, "素材はまだ登録されていません");
  const headers = new Headers({ ...secureHeaders, "Content-Type": asset.type, "Accept-Ranges": "bytes", ETag: `"${object.etag.replaceAll('"', '')}"` });
  headers.set("Content-Disposition", `${asset.type === "application/zip" ? "attachment" : "inline"}; filename="${asset.id}.${asset.type === "application/zip" ? "zip" : "mp4"}"; filename*=UTF-8''${encodeURIComponent(asset.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`);
  let offset = 0, length = object.size, status = 200;
  const range = request.method === "GET" ? request.headers.get("Range") : null;
  const ifRange = request.headers.get("If-Range");
  if (range && (!ifRange || ifRange === headers.get("ETag"))) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = () => { headers.set("Content-Range", `bytes */${object.size}`); return new Response(null, { status: 416, headers }); };
    if (!match || (!match[1] && !match[2]) || object.size === 0) return invalid();
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
      offset = Math.max(0, object.size - suffix);
      length = object.size - offset;
    } else {
      offset = Number(match[1]);
      const end = match[2] ? Number(match[2]) : object.size - 1;
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= object.size || end < offset) return invalid();
      length = Math.min(end, object.size - 1) - offset + 1;
    }
    status = 206;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
  }
  headers.set("Content-Length", String(length));
  if (request.method === "HEAD") return new Response(null, { status, headers });
  const body = await store.read(asset.path.slice(1), offset, length);
  if (!body) return mediaError(404, "素材が見つかりません");
  return new Response(body, { status, headers });
}
