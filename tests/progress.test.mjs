import assert from "node:assert/strict";
import test from "node:test";
import { changeCheck, normalizeProgress, markStepIncomplete, step5VideoKey, step5CompletedCount, initialState } from "../app/progress.ts";
test("keeps legacy Step1–4 records, position, checks, and sheet URL", () => {
  const old = { completed: [1, 2, 3, 4], position: { 1: 8, 4: 4 }, checks: { "1-8-0": true, "3-6-0": true }, form: { analysisSheetUrl: "https://docs.google.com/spreadsheets/d/existing/edit" }, currentStep: 4, lastWorkedStep: 4 };
  assert.deepEqual(normalizeProgress(old), old);
  assert.equal(step5CompletedCount(old.checks), 0);
});
test("six submissions complete Step5, unchecking and reset remove completion", () => {
  let saved = normalizeProgress({ ...initialState, completed: [1, 2, 3, 4] });
  for (let i = 0; i < 6; i++) {
    saved = changeCheck(saved, step5VideoKey(i), true);
    assert.equal(step5CompletedCount(saved.checks), i + 1);
    assert.equal(saved.completed.includes(5), i === 5);
  }
  saved = normalizeProgress(JSON.parse(JSON.stringify(saved)));
  saved = changeCheck(saved, step5VideoKey(4), false);
  assert.deepEqual(saved.completed, [1, 2, 3, 4]);
  assert.equal(step5CompletedCount(saved.checks), 5);
  assert.equal(saved.checks[step5VideoKey(3)], true);
  const reset = markStepIncomplete(changeCheck(saved, step5VideoKey(4), true), 5);
  assert.equal(step5CompletedCount(reset.checks), 0);
  assert.deepEqual(reset.completed, [1, 2, 3, 4]);
});
test("Step5 needs six content checks; duplicate completion IDs are ignored", () => {
  assert.deepEqual(normalizeProgress({ completed: [1, 1, 4, 5, 6], currentStep: 99 }).completed, [1, 4]);
  assert.equal(normalizeProgress({ currentStep: 99 }).currentStep, 6);
});
