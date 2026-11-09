import {PROGRESS_CLIENT,PROGRESS_CLIENT_HEADER} from "../app/progress-protocol.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { env, cookieValues } from "./runtime-mock.mjs";
import * as setup from "../app/api/admin/bootstrap/route.ts";
import * as users from "../app/api/admin/users/route.ts";
import * as login from "../app/api/auth/login/route.ts";
import * as logout from "../app/api/auth/logout/route.ts";
import * as me from "../app/api/me/route.ts";
import * as progress from "../app/api/progress/route.ts";
import * as admin from "../app/api/admin/progress/route.ts";
import * as sheet from "../app/api/analysis-sheet/route.ts";
import { step5VideoKey, step6VideoKey } from "../app/progress.ts";
import { prepareStepFive, selectPracticeVideo, currentPracticeVideo } from "../app/step-five-progress.ts";

// Runs the real route handlers, SQL, PIN hashing and session logic against an
// isolated in-memory SQLite database. No production database or network access.
function localD1(database) {
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      const bind = args => ({
        bind: (...values) => bind(values),
        async first() { return statement.get(...args) ?? null; },
        async all() { return { results: statement.all(...args) }; },
        async run() { return statement.run(...args); },
      });
      return bind([]);
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
  };
}
const request = (body, method = "POST") => new Request("https://local.test/api", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("login, legacy data, six-step persistence, admin totals and sheet contract", async () => {
  const database = new DatabaseSync(":memory:");
  for (const file of ["0000_messy_vivisector.sql", "0001_deep_hitman.sql", "0002_rename_admin.sql", "0003_drive_saving.sql"]) database.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  env.DB = localD1(database);
  cookieValues.clear();
  try {
    assert.equal((await progress.GET()).status, 401);
    assert.equal((await setup.POST(request({ name: "確認用管理者", pin: "2468" }))).status, 200);
    assert.equal((await protectedProgressPUT(request({ completed: [4], checks: {} }, "PUT"))).status, 400);
    assert.equal((await protectedProgressPUT(request({ completed: [4], checks: Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`4-5-${index}`, true])) }, "PUT"))).status, 200);
    const added = await users.POST(request({ name: "確認用利用者", pin: "1357" }));
    assert.equal(added.status, 201);
    const { user } = await added.json();
    const originalAccount = database.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    const legacy = { completed: [1, 2, 3, 4], position: { 1: 8, 4: 4 }, checks: { "1-8-0": true, "3-6-0": true }, form: { analysisSheetUrl: "https://docs.google.com/spreadsheets/d/existing/edit" }, currentStep: 4, lastWorkedStep: 4 };
    database.prepare("UPDATE user_progress SET completed_steps=?, positions=?, checks=?, form_values=?, current_step=4, last_worked_step=4 WHERE user_id=?").run(JSON.stringify(legacy.completed), JSON.stringify(legacy.position), JSON.stringify(legacy.checks), JSON.stringify(legacy.form), user.id);
    await logout.POST();
    assert.equal((await login.POST(request({ name: user.name, pin: "9999" }))).status, 401);
    assert.equal((await login.POST(request({ name: user.name, pin: "1357" }))).status, 200);
    assert.equal((await me.GET()).status, 200);
    assert.equal((await admin.GET()).status, 403);
    let saved = (await (await progress.GET()).json()).progress;
    const { updatedAt: _updatedAt, ...restored } = saved;
    assert.deepEqual(restored, legacy);
    saved.checks['step5-video-1-submitted'] = true;
    saved.currentStep = saved.lastWorkedStep = 5;
    for (let i = 0; i < 3; i++) saved.checks[step5VideoKey(i)] = true;
    saved = selectPracticeVideo(prepareStepFive(saved), 3);
    assert.equal((await protectedProgressPUT(request(saved, "PUT"))).status, 200);
    await logout.POST();
    await login.POST(request({ name: user.name, pin: "1357" }));
    saved = (await (await progress.GET()).json()).progress;
    assert.equal(saved.position[5], 1);
    assert.equal(currentPracticeVideo(saved), 3);
    for (let i = 0; i < 3; i++) assert.equal(saved.checks[step5VideoKey(i)], true);
    assert.equal(saved.form.analysisSheetUrl, legacy.form.analysisSheetUrl);
    for (let i = 0; i < 2; i++) saved.checks[step6VideoKey(i)] = true;
    saved = selectPracticeVideo(saved, 2, 6);
    await protectedProgressPUT(request(saved, 'PUT'));
    await logout.POST();
    await login.POST(request({ name: user.name, pin: '1357' }));
    saved = (await (await progress.GET()).json()).progress;
    assert.equal(currentPracticeVideo(saved, 6), 2);
    assert.equal(currentPracticeVideo(saved, 5), 3);
    assert.equal(saved.checks['step5-video-1-submitted'], true);
    assert.ok(saved.form.legacyPracticeSnapshot);
    for (let i = 0; i < 6; i++) saved.checks[step5VideoKey(i)] = true;
    for (let i = 0; i < 4; i++) saved.checks[step6VideoKey(i)] = true;
    await protectedProgressPUT(request(saved, "PUT"));
    assert.deepEqual((await (await progress.GET()).json()).progress.completed, [1, 2, 3, 4, 5, 6]);
    await logout.POST();
    await login.POST(request({ name: "確認用管理者", pin: "2468" }));
    let row = (await (await admin.GET()).json()).users[0];
    assert.equal(row.progressRate, 100);
    assert.equal(row.step5CompletedCount, 6);
    assert.equal(row.completedCount, 6);
    assert.equal(row.step6CompletedCount, 4);
    assert.equal(row.legacySubmissionCount, 1);
    await logout.POST();
    await login.POST(request({ name: user.name, pin: "1357" }));
    saved.checks[step5VideoKey(2)] = false;
    await protectedProgressPUT(request(saved, "PUT"));
    saved = (await (await progress.GET()).json()).progress;
    assert.equal(saved.checks[step5VideoKey(2)], false);
    assert.deepEqual(saved.completed, [1, 2, 3, 4, 6]);
    const originalFetch = globalThis.fetch;
    env.ANALYSIS_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/test-only/exec";
    env.ANALYSIS_SHEET_API_SECRET = "test-only-not-a-production-secret";
    globalThis.fetch = async (url, options) => {
      assert.equal(url, env.ANALYSIS_SHEET_WEB_APP_URL);
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { userName: user.name, secret: env.ANALYSIS_SHEET_API_SECRET });
      return Response.json({ ok: true, url: legacy.form.analysisSheetUrl, created: false });
    };
    try {
      const response = await sheet.POST();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).url, legacy.form.analysisSheetUrl);
    } finally { globalThis.fetch = originalFetch; }
    await logout.POST();
    await login.POST(request({ name: "確認用管理者", pin: "2468" }));
    row = (await (await admin.GET()).json()).users[0];
    assert.equal(row.progressRate, 83);
    assert.equal(row.step5CompletedCount, 5);
    const account = database.prepare("SELECT * FROM users WHERE id=?").get(user.id);
    assert.equal(account.pin_hash, originalAccount.pin_hash);
    assert.equal(account.id, originalAccount.id);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM users").get().count, 2);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM user_progress").get().count, 2);
  } finally { cookieValues.clear(); database.close(); delete env.DB; }
});

async function protectedProgressPUT(request){
 const read=await progress.GET();const state=await read.json();
 const headers=new Headers(request.headers);headers.set(PROGRESS_CLIENT_HEADER,PROGRESS_CLIENT);headers.set('If-Match',state.revision);
 return progress.PUT(new Request(request,{headers}));
}
