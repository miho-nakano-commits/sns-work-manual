export const PROGRESS_CLIENT_HEADER = "X-SNS-Progress-Client";
export const PROGRESS_CLIENT = "sns-progress-v2-release";

export function stableProgress(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableProgress).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stableProgress(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
