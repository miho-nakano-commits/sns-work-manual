import { env } from "cloudflare:workers";
export type MediaBindings = { MEDIA?: R2Bucket };
export const mediaBindings = () => env as unknown as MediaBindings;
