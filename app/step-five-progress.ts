import { normalizeProgress, practiceCompletedCount, type SavedState } from "./progress";
import { practiceIds, practiceKey, practiceIndexKey } from "./practice-catalog";

export function firstUnsubmittedVideo(state: SavedState, step = 5) {
  const ids = practiceIds(step);
  const index = ids.findIndex(id => !state.checks[practiceKey(id)]);
  return index < 0 ? ids.length - 1 : index;
}
export function currentPracticeVideo(state: SavedState, step = 5) {
  const ids = practiceIds(step);
  const stored = ids.findIndex(id => id === state.form[practiceIndexKey(step)]);
  return Math.min(stored < 0 ? firstUnsubmittedVideo(state, step) : stored, firstUnsubmittedVideo(state, step));
}
export function prepareStepFive(state: SavedState, step = 5): SavedState {
  const normalized = normalizeProgress(state);
  if (normalized.form[`practiceLayout${step}`] === "content-v2") return normalized;
  const index = firstUnsubmittedVideo(normalized, step);
  return normalizeProgress({ ...normalized,
    position: { ...normalized.position, [step]: practiceCompletedCount(normalized.checks, step) === practiceIds(step).length ? 2 : 0 },
    form: { ...normalized.form, [`practiceLayout${step}`]: "content-v2", [practiceIndexKey(step)]: practiceIds(step)[index] },
  });
}
export function selectPracticeVideo(state: SavedState, requested: number, step = 5): SavedState {
  const prepared = prepareStepFive(state, step);
  const ids = practiceIds(step);
  const index = Math.min(Math.max(0, Math.trunc(requested)), firstUnsubmittedVideo(prepared, step), ids.length - 1);
  return { ...prepared, currentStep: step, lastWorkedStep: step, position: { ...prepared.position, [step]: 1 }, form: { ...prepared.form, [practiceIndexKey(step)]: ids[index] } };
}
