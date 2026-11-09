import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { env, cookieValues } from './runtime-mock.mjs';
import { canStaffReview } from '../app/server-staff-review.ts';
import * as access from '../app/api/staff-review/access/route.ts';
import StaffReviewPage from '../app/staff-review/page.tsx';
import StaffReviewNotFound from '../app/staff-review/not-found.tsx';
import { StaffReviewClient } from '../app/staff-review-client.tsx';
import { PracticeMedia } from '../app/practice-media.tsx';
import { practiceVideos } from '../app/step-five-materials.ts';
import { createSession, SESSION_COOKIE } from '../app/server-auth.ts';

test('staff access fails closed and only exact server-configured IDs grant review', () => {
  const user = { id: 'staff-a', name: '同じ名前', role: 'user' };
  delete env.STAFF_REVIEW_USER_IDS;
  assert.equal(canStaffReview(null), false);
  assert.equal(canStaffReview(user), false);
  assert.equal(canStaffReview({...user,role:'admin'}), true);
  for (const value of ['staff-a', '{', '{}', '[true]', '["staff-a",null]', '[""]', '["STAFF-A"]']) {
    env.STAFF_REVIEW_USER_IDS = value;
    assert.equal(canStaffReview(user), false, value);
  }
  env.STAFF_REVIEW_USER_IDS = '["staff-a"]';
  assert.equal(canStaffReview(user), true);
  assert.equal(canStaffReview({...user,id:'staff-b'}), false);
  delete env.STAFF_REVIEW_USER_IDS;
});

test('review configuration never borrows the production staff allowlist', () => {
  env.REVIEW_MODE = 'true'; env.STAFF_REVIEW_USER_IDS = '["staff-a"]';
  const user = { id:'staff-a',name:'職員',role:'user' };
  assert.equal(canStaffReview(user), false);
  env.REVIEW_STAFF_REVIEW_USER_IDS = '["staff-a"]';
  assert.equal(canStaffReview(user), true);
  delete env.REVIEW_MODE; delete env.STAFF_REVIEW_USER_IDS; delete env.REVIEW_STAFF_REVIEW_USER_IDS;
});

test('direct page and API enforce live session and server permissions without changing any DB records', async () => {
  const db = new DatabaseSync(':memory:'); let readOnly = false;
  env.DB = {prepare(sql) {
    const statement = db.prepare(sql);
    const bind = (args=[]) => ({bind:(...values)=>bind(values),first:async()=>statement.get(...args)??null,
      run:async()=>{assert.equal(readOnly,false,'Review request must never write');return statement.run(...args);}});
    return bind();
  }};
  const snapshot = () => JSON.stringify(['users','sessions','user_progress','user_drive_settings','drive_save_progress'].map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()));
  try {
    for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>/^\d+.*\.sql$/.test(n)).sort()) db.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
    for(const [id,role] of [['admin','admin'],['staff','user'],['learner','user']]) {
      db.prepare('INSERT INTO users (id,name,pin_salt,pin_hash,role,active) VALUES (?,?,?,?,?,1)').run(id,id,'retained-salt','retained-hash',role);
    }
    cookieValues.clear(); readOnly=true;
    assert.equal((await access.GET()).status,401);
    await assert.rejects(StaffReviewPage(),error=>error.status===307&&error.headers.get('Location')==='/');
    for(const [id,allowed] of [['learner',false],['admin',true],['staff',false],['staff',true]]) {
      readOnly=false;cookieValues.clear();await createSession(id);readOnly=true;
      if(id==='staff'&&allowed)env.STAFF_REVIEW_USER_IDS='["staff"]';
      const before=snapshot();const response=await access.GET();
      assert.equal(response.status,allowed?200:403);
      assert.equal(response.headers.get('Cache-Control'),'private, no-store');
      if(allowed)assert.equal((await StaffReviewPage()).type,StaffReviewClient);
      else await assert.rejects(StaffReviewPage(),error=>error.status===404);
      assert.equal(snapshot(),before);
    }
    delete env.STAFF_REVIEW_USER_IDS;
    assert.equal((await access.GET()).status,403,'Revocation takes effect with existing cookie');
    readOnly=false; db.prepare("UPDATE users SET active=0 WHERE id='staff'").run();readOnly=true;
    assert.equal((await access.GET()).status,401,'Inactive account rejected');
    cookieValues.set(SESSION_COOKIE,'invalid-session');
    assert.equal((await access.GET()).status,401);
  } finally { readOnly=false;db.close();delete env.DB;delete env.STAFF_REVIEW_USER_IDS;cookieValues.clear(); }
});

test('read-only client has no completion controls or progress persistence and shares all ten media lessons', async () => {
  const html=renderToStaticMarkup(React.createElement(StaffReviewClient));
  assert.match(html,/基本編6本/);assert.match(html,/応用編4本/);
  assert.match(html,/閲覧専用/);assert.doesNotMatch(html,/type="checkbox"|STEP[56] 完了|Googleドライブに保存できました/);
  for(const step of [5,6]) for(const video of practiceVideos(step)) {
    const media=renderToStaticMarkup(React.createElement(PracticeMedia,{video}));
    assert.ok(media.includes(`/api/media/${video.contentId}-reference`));assert.ok(media.includes(`/api/media/${video.contentId}-images`));
    if(step===6)assert.ok(media.includes(video.operation));
  }
  const source=await readFile(new URL('../app/staff-review-client.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/useProgressSave|useDriveSave|saveCheck|fetch\(|localStorage|sessionStorage/);
});

test('denied review explains permissions and how to sign in as administrator', () => {
  const html = renderToStaticMarkup(React.createElement(StaffReviewNotFound));
  assert.match(html, /職員用画面を開く権限がありません/);
  assert.match(html, /ログアウト/);
  assert.match(html, /管理者の氏名とPIN/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /<video|\.zip|type="checkbox"/);
});
