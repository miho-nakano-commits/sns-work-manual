import { practiceIds, practiceKey, practiceIndexKey } from "./practice-catalog";
export { practiceKey } from "./practice-catalog";
export const TOTAL_STEPS = 6;
export const STEP5_VIDEO_COUNT = 6;
export const STEP6_VIDEO_COUNT = 4;
export const STEP5_VIDEO_INDEX_KEY = "step5VideoIndex";
export const STEP5_LAYOUT_KEY = "step5Layout";
export const STEP5_LAYOUT_VERSION = "sequential-v1";
export const STEP4_CHECK_PREFIX = "4-5";
export const STEP4_CHECK_COUNT = 5;
export const STEP3_CHECK_PREFIX = "step3-analysis-v2";

export type SavedState = {
  completed: number[];
  position: Record<number, number>;
  checks: Record<string, boolean>;
  form: Record<string, string>;
  currentStep: number;
  lastWorkedStep: number;
};

export const initialState: SavedState = {
  completed: [], position: {}, checks: {}, form: {}, currentStep: 1, lastWorkedStep: 1,
};

export const step5VideoKey = (index: number) => practiceKey(practiceIds(5)[index]);
export const step6VideoKey = (index: number) => practiceKey(practiceIds(6)[index]);
export const practiceCompletedCount = (checks: Record<string, boolean>, step: number) =>
  practiceIds(step).filter(id => checks[practiceKey(id)] === true).length;
export const step5CompletedCount = (checks: Record<string, boolean>) => practiceCompletedCount(checks, 5);
export const step6CompletedCount = (checks: Record<string, boolean>) => practiceCompletedCount(checks, 6);
export const legacySubmissionNumbers = (checks: Record<string, boolean>) =>
  Array.from({ length: 10 }, (_, i) => i + 1).filter(n => checks[`step5-video-${n}-submitted`] === true);

export function clampStep(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(TOTAL_STEPS, Math.max(1, Math.trunc(number))) : 1;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// Keep existing keys and Step1–4 completion records. No database migration is needed.
export function normalizeProgress(value: unknown): SavedState {
  const source = record(value);
  const checks = Object.fromEntries(Object.entries(record(source.checks)).filter(([, v]) => typeof v === "boolean")) as SavedState["checks"];
  const form = Object.fromEntries(Object.entries(record(source.form)).filter(([, v]) => typeof v === "string")) as SavedState["form"];
  const position = Object.fromEntries(Object.entries(record(source.position)).filter(([, v]) => typeof v === "number" && Number.isInteger(v) && v >= 0)) as SavedState["position"];
  const completed = Array.from(new Set(Array.isArray(source.completed)
    ? source.completed.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= 4) : []));
  // Keep a lossless snapshot before reinterpreting legacy course positions/completion.
  // Number-only submissions cannot identify which historical content was submitted.
  if (!form.legacyPracticeSnapshot && (Object.keys(checks).some(k => /^step5-video-\d+-submitted$/.test(k)) || (Array.isArray(source.completed) && source.completed.includes(5) && !Object.keys(checks).some(k => k.startsWith("practice:"))))) {
    form.legacyPracticeSnapshot = JSON.stringify({ completed: source.completed, position: source.position, checks: source.checks, form: { ...form }, currentStep: source.currentStep, lastWorkedStep: source.lastWorkedStep });
  }
  for (const step of [5, 6]) if (practiceCompletedCount(checks, step) === practiceIds(step).length) completed.push(step);
  return { completed, position, checks, form, currentStep: clampStep(source.currentStep), lastWorkedStep: clampStep(source.lastWorkedStep ?? source.currentStep) };
}

export function changeCheck(state: SavedState, key: string, checked: boolean): SavedState {
  return normalizeProgress({ ...state,
    completed: !checked && key.startsWith(`${STEP4_CHECK_PREFIX}-`) ? state.completed.filter(id => id !== 4) : state.completed,
    checks: { ...state.checks, [key]: checked },
  });
}

export function markStepIncomplete(state: SavedState, id: number): SavedState {
  const checks = { ...state.checks };
  if (id >= 5) for (const contentId of practiceIds(id)) checks[practiceKey(contentId)] = false;
  return normalizeProgress({ ...state, checks, position: id >= 5 ? { ...state.position, [id]: 1 } : state.position, form: id >= 5 ? { ...state.form, [practiceIndexKey(id)]: practiceIds(id)[0], [`practiceLayout${id}`]: "content-v2" } : state.form, completed: state.completed.filter(step => step !== id), currentStep: id, lastWorkedStep: id });
}

export function parseJson(value: string | null | undefined, fallback: unknown = {}) {
  try { return JSON.parse(value ?? ""); } catch { return fallback; }
}
