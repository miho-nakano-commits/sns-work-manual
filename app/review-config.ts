import { env } from "cloudflare:workers";

export type ReviewBindings = {
  REVIEW_MODE?: string;
  REVIEW_DB?: D1Database;
  REVIEW_MEDIA?: R2Bucket;
};
export const reviewBindings = () => env as unknown as ReviewBindings;
// A review build stays review-only even if a future runtime flag is omitted.
export const isReview = () => process.env.NEXT_PUBLIC_REVIEW_MODE === "true" || reviewBindings().REVIEW_MODE === "true";
