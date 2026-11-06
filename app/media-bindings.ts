import { env } from "cloudflare:workers";
export type MediaBindings = { MEDIA?: R2Bucket; MEDIA_UPLOAD_ENABLED?: string };
export const mediaBindings = () => env as unknown as MediaBindings;
