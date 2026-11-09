import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from '../app/page.tsx';
import { STEPS } from '../app/curriculum.ts';
import { StepFiveContent, PracticeVideoLesson } from '../app/step-five.tsx';
import { DriveContext } from '../app/drive-ui.tsx';
import { driveProgressView } from '../app/drive-model.ts';
const renderDriveMarkup = element => renderToStaticMarkup(React.createElement(DriveContext.Provider,{value:{folderUrl:'https://drive.google.com/drive/folders/test-only',ready:true,busy:false,error:'',retry(){}}},element));
import { initialState, normalizeProgress, step5VideoKey, changeCheck } from '../app/progress.ts';
import { prepareStepFive } from '../app/step-five-progress.ts';
import { PRACTICE_VIDEOS } from '../app/step-five-materials.ts';

test('renders application instead of removed starter', () => {
  assert.match(renderDriveMarkup(React.createElement(Home)), /読み込んでいます/);
});
test('six steps and consistent curriculum; Step4 submission is last check', () => {
  assert.deepEqual(STEPS.map(s => s.id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(STEPS.map(s => s.screens.length), [9, 9, 7, 6, 3, 3]);
  assert.equal(STEPS[3].screens.at(-1).type, 'checklist');
  assert.equal(STEPS[3].screens.at(-1).items.at(-1), 'Googleドライブに保存できました');
  assert.doesNotMatch(JSON.stringify(STEPS), /フォロワー1万人|指定件数|指定された件数|10万回再生より多い/);
  assert.match(JSON.stringify(STEPS), /10万回ちょうど/);
  assert.match(STEPS[0].screens[8].items.at(-1), /直近1か月以内.*1万回以上/);
  assert.equal(STEPS[2].screens.find(s => s.type === 'goal').items.length, 6);
});

test('Step6 displays zoom/audio instructions, encouragement and independent four-video clear', () => {
  const fresh = renderDriveMarkup(React.createElement(StepFiveContent, { type: 'practiceVideo', stepId: 6, saved: initialState, ...callbacks }));
  assert.match(fresh, /ズーム編集/);
  assert.match(fresh, /キーフレーム/);
  assert.match(fresh, /自分のペースで大丈夫/);
  assert.match(fresh, /aria-valuemax="4"/);
  const checks = Object.fromEntries(['seasons','psychology','dream-home','healing'].map(id => [`practice:${id}:submitted`,true]));
  const complete = normalizeProgress({ checks });
  assert.deepEqual(complete.completed, [6]);
  const clear = renderDriveMarkup(React.createElement(StepFiveContent, { type: 'practiceComplete', stepId: 6, saved: complete, ...callbacks }));
  assert.match(clear, /4本の動画が完成しました/);
  const audio = renderDriveMarkup(React.createElement(StepFiveContent, { type: 'practiceVideo', stepId: 6, saved: { ...complete, form: { practiceStep6ContentId: 'healing' } }, ...callbacks }));
  assert.match(audio, /音声編集/);
  assert.match(audio, /音声を抽出/);
  assert.match(audio, /保存できましたね/);
});

test('legacy review requires explicit topic confirmation and does not precheck moved videos', () => {
  const html = renderDriveMarkup(React.createElement(StepFiveContent, { type: 'practiceVideo', stepId: 6, saved: normalizeProgress({ checks: { 'step5-video-7-submitted': true } }), ...callbacks }));
  assert.match(html, /自動では引き継いでいません/);
  assert.match(html, /以前の提出記録/);
  assert.doesNotMatch(html, /checked=""/);
});
const callbacks = { update() {}, onSelectVideo() {}, onExplanation() {}, onShowClear() {} };
const render = (type, saved = initialState) => renderDriveMarkup(React.createElement(StepFiveContent, { type, saved, ...callbacks }));
test('unregistered materials still render pending without fake links', () => {
  const html = renderDriveMarkup(React.createElement(PracticeVideoLesson, {
    video: { id: 2, editingMaterials: [], referenceVideo: null },
    count: 0, checked: false, onCheck() {}, onPrevious() {}, onNext() {},
  }));
  assert.equal((html.match(/class="material-pending">準備中/g) || []).length, 2);
  assert.doesNotMatch(html, /href="[^"]*\.(zip|mp4)|<video/);
  assert.match(html, /2本目の編集素材/);
  assert.match(html, /2本目の見本動画/);
});
test('each video distinguishes its topic-specific editing ZIP from the playable reference', () => {
  for (const video of PRACTICE_VIDEOS) {
    const html = renderDriveMarkup(React.createElement(PracticeVideoLesson, {
      video, count: 0, checked: false, onCheck() {}, onPrevious() {}, onNext() {},
    }));
    assert.ok(html.includes(video.title));
    assert.ok(html.includes(`href="/api/media/${video.contentId}-images"`));
    assert.ok(html.includes(`src="/api/media/${video.contentId}-reference"`));
    assert.match(html, /見本動画はこのZIPには含まれません/);
    assert.doesNotMatch(html, /material-pending/);
  }
});
test('only the current submission is shown and next requires its checkbox', () => {
  assert.equal((render('practiceVideo').match(/type="checkbox"/g) || []).length, 1);
  assert.match(render('practiceVideo'), /1本目：Googleドライブに保存できました/);
  assert.match(render('practiceVideo'), /disabled="">次の動画へ/);
  const saved = changeCheck(prepareStepFive(initialState), step5VideoKey(0), true);
  assert.doesNotMatch(render('practiceVideo', saved), /disabled="">次の動画へ/);
  assert.match(render('practiceVideo', saved), /1本目の動画を作ろう/);
  assert.doesNotMatch(render('practiceComplete'), /おめでとうございます/);
  const all = normalizeProgress({ checks: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [step5VideoKey(i), true])) });
  assert.match(render('practiceComplete', all), /6本の動画が完成しました/);
  assert.match(render('practiceComplete', all), /aria-valuenow="6"/);
});
test('registered per-video material URLs and reference video are rendered separately', () => {
  const html = renderDriveMarkup(React.createElement(PracticeVideoLesson, {
    video: { id: 2, editingMaterials: [{ label: '2本目の画像素材', href: '/step5/fruit/editing-images.zip', downloadName: '動画2.zip' }], referenceVideo: { src: '/step5/fruit/reference.mp4', mimeType: 'video/mp4' } },
    count: 1, checked: false, onCheck() {}, onPrevious() {}, onNext() {},
  }));
  assert.match(html, /href="\/api\/media\/fruit-images"/);
  assert.match(html, /src="\/api\/media\/fruit-reference"/);
  assert.match(html, /2本目の見本動画/);
  assert.match(html, /前の動画へ/);
});
test('download label and filename are MP4', async () => {
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /download="見本動画\.mp4"/);
  assert.match(page, /見本動画・MP4形式/);
  assert.doesNotMatch(page, /見本動画\.mov|MOV形式/);
});

test('old submissions remain read-only while a missing folder blocks only new confirmation', () => {
  const legacy = normalizeProgress({checks:{'practice:fruit:submitted':true}});
  const html = renderToStaticMarkup(React.createElement(DriveContext.Provider,{value:{folderUrl:null,ready:true,busy:false,error:'',retry(){}}},React.createElement(StepFiveContent,{type:'practiceVideo',stepId:5,saved:driveProgressView(legacy,{}),legacySaved:legacy,...callbacks})));
  assert.match(html,/以前の提出記録/);assert.match(html,/旧方式：1本/);assert.match(html,/保存先は準備中/);
  assert.match(html,/type="checkbox"[^>]*disabled=""/);assert.doesNotMatch(html,/checked=""/);assert.doesNotMatch(html,/自分のGoogleドライブフォルダを開く/);
});
