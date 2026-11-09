import { createReadStream } from "node:fs";
import { cp, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import type { Plugin } from "vite";
import { mediaError, serveMedia, type MediaStore } from "../app/media-response";
import { ZOOM_GUIDE_ASSET } from "../app/media-catalog";

export async function reviewPublicDirectory() {
  const directory = resolve("work/review-public");
  await mkdir(directory, { recursive: true });
  for (const name of ["favicon.svg", "file.svg", "globe.svg", "window.svg", "sns-quest-hero.png"]) await cp(resolve("public", name), resolve(directory, name));
  return directory;
}

// Development-only substitute for private R2. Reads the originals without copying
// media, creating a bucket or uploading anything. Auth uses the real local API.
export function reviewLocalMedia(): Plugin {
  const localFile = (key: string) => key === ZOOM_GUIDE_ASSET.path.slice(1) ? resolve("work/local-media/zoom-operation.mp4") : resolve("public", key);
  const store: MediaStore = {
    async head(key) {
      try { const info = await stat(localFile(key)); return { size: info.size, etag: `${info.size}-${info.mtimeMs}` }; } catch { return null; }
    },
    async read(key, offset, length) {
      return Readable.toWeb(createReadStream(localFile(key), { start: offset, end: offset + length - 1 })) as ReadableStream<Uint8Array>;
    },
  };
  return { name: "review-local-private-media", apply: "serve", configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      let pathname: string;
      try { pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname); } catch { res.writeHead(400).end(); return; }
      const match = /^\/api\/review-media\/([a-z0-9-]+)$/.exec(pathname);
      if (!match) {
        // Stop direct public and Vite /@fs aliases before static middleware.
        if (/\.(mp4|mov|zip)$/i.test(pathname) || /(?:^|\/)step5\//i.test(pathname) || /(?:^|\/)step4-/i.test(pathname)) { res.writeHead(404).end(); return; }
        return next();
      }
      const address = server.httpServer?.address();
      if (!address || typeof address === "string") { res.writeHead(503).end(); return; }
      const origin = `http://127.0.0.1:${address.port}`;
      const request = new Request(origin + pathname, { method: req.method, headers: new Headers(Object.entries(req.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(", ") : value]])) });
      try {
        const response = await serveMedia(request, match[1], async () => {
          const auth = await fetch(origin + "/api/me", { headers: { Cookie: req.headers.cookie || "" }, redirect: "error" });
          return auth.ok && !!(await auth.json() as { user?: unknown }).user;
        }, store);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        if (!response.body) res.end(); else Readable.fromWeb(response.body as import("node:stream/web").ReadableStream).pipe(res);
      } catch { const error = mediaError(503, "素材を読み込めませんでした"); res.writeHead(error.status, Object.fromEntries(error.headers)).end(); }
    });
  } };
}
