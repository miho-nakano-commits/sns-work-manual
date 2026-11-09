import { ALL_VIDEO_IDS, practiceIds, practiceKey } from "./practice-catalog";
import { STEP4_CHECK_PREFIX, type SavedState } from "./progress";

export const DRIVE_CONTENT_IDS = ["step4-first-video", ...ALL_VIDEO_IDS] as const;
export type DriveChecks = Record<string, boolean>;
export type DriveData = { folderUrl: string | null; checks: DriveChecks };
export const emptyDrive: DriveData = { folderUrl: null, checks: {} };
export function normalizeFolderUrl(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 1000) throw new Error("GoogleドライブのフォルダURLを入力してください");
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("GoogleドライブのフォルダURLを入力してください"); }
  const match = /^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.port || url.username || url.password || !match) throw new Error("https://drive.google.com/drive/folders/ から始まるフォルダURLを入力してください");
  const canonical = new URL(`https://drive.google.com/drive/folders/${match[1]}`);
  const resourceKey = url.searchParams.get("resourcekey");
  if (resourceKey) {
    if (!/^[A-Za-z0-9_-]+$/.test(resourceKey)) throw new Error("フォルダURLの形式を確認してください");
    canonical.searchParams.set("resourcekey", resourceKey);
  }
  return canonical.href;
}
// Derived view only: never write these virtual legacy-shaped keys into user_progress.
export function driveProgressView(raw: SavedState, checks: DriveChecks): SavedState {
  const viewChecks: Record<string,boolean> = { ...raw.checks, [`${STEP4_CHECK_PREFIX}-4`]: checks["step4-first-video"] === true };
  for (const id of ALL_VIDEO_IDS) viewChecks[practiceKey(id)] = checks[id] === true;
  const completed = raw.completed.filter(step => step <= 3);
  if (Array.from({length: 5}, (_, i) => viewChecks[`${STEP4_CHECK_PREFIX}-${i}`] === true).every(Boolean)) completed.push(4);
  for (const step of [5, 6]) if (practiceIds(step).every(id => checks[id] === true)) completed.push(step);
  return {...raw, checks: viewChecks, completed};
}
