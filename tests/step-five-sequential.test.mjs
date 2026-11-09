import assert from 'node:assert/strict';
import test from 'node:test';
import { initialState, normalizeProgress, changeCheck, markStepIncomplete, practiceCompletedCount } from '../app/progress.ts';
import { practiceIds, practiceKey, practiceIndexKey } from '../app/practice-catalog.ts';
import { prepareStepFive, selectPracticeVideo, currentPracticeVideo } from '../app/step-five-progress.ts';
import { practiceVideos, ALL_PRACTICE_VIDEOS } from '../app/step-five-materials.ts';

test('six basic and four advanced topics have stable content IDs and reuse all media', () => {
  assert.deepEqual(practiceVideos(5).map(v => v.title), ['フルーツ雑学','お菓子の家','クイズ','宇宙','100年後','片付け']);
  assert.deepEqual(practiceVideos(6).map(v => v.title), ['四季','心理テスト','住みたい世界（住めるなら？）','癒し']);
  assert.deepEqual(practiceVideos(6).map(v => v.operation), ['ズーム編集','ズーム編集','ズーム編集','音声編集']);
  const videos = [...practiceVideos(5), ...practiceVideos(6)];
  assert.equal(new Set(videos.map(v => v.contentId)).size, 10);
  for (const video of videos) {
    const original = ALL_PRACTICE_VIDEOS.find(v => v.contentId === video.contentId);
    assert.equal(video.editingMaterials[0].href, original.editingMaterials[0].href);
    assert.equal(video.referenceVideo.src, original.referenceVideo.src);
  }
});

test('courses unlock sequentially and persist and complete independently', () => {
  let saved = normalizeProgress(initialState);
  for (const step of [5,6]) {
    saved = selectPracticeVideo(saved, 99, step);
    assert.equal(currentPracticeVideo(saved, step), 0);
    for (let index = 0; index < practiceIds(step).length; index++) {
      saved = selectPracticeVideo(saved, index, step);
      assert.equal(currentPracticeVideo(saved, step), index);
      assert.equal(currentPracticeVideo(selectPracticeVideo(saved, index + 1, step), step), index);
      saved = changeCheck(saved, practiceKey(practiceIds(step)[index]), true);
    }
    assert.ok(saved.completed.includes(step));
    saved = normalizeProgress(JSON.parse(JSON.stringify(saved)));
    assert.equal(saved.form.legacyPracticeSnapshot, undefined);
    assert.equal(saved.form[practiceIndexKey(step)], practiceIds(step).at(-1));
  }
  saved = changeCheck(saved, practiceKey('seasons'), false);
  assert.equal(practiceCompletedCount(saved.checks, 6), 3);
  assert.equal(practiceCompletedCount(saved.checks, 5), 6);
  assert.deepEqual(saved.completed, [5]);
  const reset = markStepIncomplete(saved, 5);
  assert.equal(practiceCompletedCount(reset.checks, 5), 0);
  assert.equal(practiceCompletedCount(reset.checks, 6), 3);
});

test('ambiguous numbered checks never auto-transfer; original records survive', () => {
  const legacy = { completed: [1,4,5], checks: { 'step5-video-1-submitted': true, 'step5-video-7-submitted': true }, position: {1:8,5:2}, form: {step5VideoIndex:'6',step5Layout:'sequential-v1',analysisSheetUrl:'keep'}, currentStep:5, lastWorkedStep:5 };
  const restored = normalizeProgress(legacy);
  assert.deepEqual(restored.checks, legacy.checks);
  assert.deepEqual(restored.completed, [1,4]);
  assert.equal(practiceCompletedCount(restored.checks, 5), 0);
  assert.equal(practiceCompletedCount(restored.checks, 6), 0);
  assert.deepEqual(JSON.parse(restored.form.legacyPracticeSnapshot).completed, legacy.completed);
  assert.deepEqual(JSON.parse(restored.form.legacyPracticeSnapshot).checks, legacy.checks);
  assert.deepEqual(JSON.parse(restored.form.legacyPracticeSnapshot).position, legacy.position);
  const reopened = prepareStepFive(prepareStepFive(restored, 5), 6);
  assert.deepEqual(reopened.checks, legacy.checks);
  assert.equal(reopened.form.analysisSheetUrl, 'keep');
  assert.equal(reopened.form.step5VideoIndex, '6');
  assert.equal(reopened.position[1], 8);
  assert.deepEqual(normalizeProgress(reopened), reopened);
  const confirmed = changeCheck(reopened, practiceKey('seasons'), true);
  assert.equal(practiceCompletedCount(confirmed.checks, 6), 1);
  assert.equal(practiceCompletedCount(confirmed.checks, 5), 0);
  assert.equal(confirmed.checks['step5-video-7-submitted'], true);
});

test('saved progress keys follow content even after reordering', () => {
  const checks = { [practiceKey('healing')]: true };
  const reordered = [...practiceVideos(6)].reverse();
  assert.equal(checks[practiceKey(reordered[0].contentId)], true);
  assert.equal(checks[practiceKey(reordered[3].contentId)], undefined);
});
