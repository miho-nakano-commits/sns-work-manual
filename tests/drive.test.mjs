import {PROGRESS_CLIENT,PROGRESS_CLIENT_HEADER} from "../app/progress-protocol.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {env,cookieValues} from './runtime-mock.mjs';
import * as bootstrap from '../app/api/admin/bootstrap/route.ts';
import * as users from '../app/api/admin/users/route.ts';
import * as login from '../app/api/auth/login/route.ts';
import * as logout from '../app/api/auth/logout/route.ts';
import * as drive from '../app/api/drive/route.ts';
import * as folders from '../app/api/admin/drive-folders/route.ts';
import * as admin from '../app/api/admin/progress/route.ts';
import * as progress from '../app/api/progress/route.ts';
import {normalizeFolderUrl,driveProgressView,DRIVE_CONTENT_IDS} from '../app/drive-model.ts';
import {normalizeProgress} from '../app/progress.ts';
const request=(body,origin)=>new Request('https://local.test/api',{method:'PUT',headers:{'Content-Type':'application/json',[PROGRESS_CLIENT_HEADER]:PROGRESS_CLIENT,...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
function d1(db){return {prepare(sql){const statement=db.prepare(sql);const bind=(args=[])=>({bind:(...values)=>bind(values),first:async()=>statement.get(...args)??null,all:async()=>({results:statement.all(...args)}),run:async()=>{const result=statement.run(...args);return {...result,meta:{changes:Number(result.changes)}};}});return bind();},batch:async statements=>Promise.all(statements.map(s=>s.run()))};}
test('Drive URL allows only HTTPS Google folders, canonicalizes account paths, keeps resource key',()=>{
 assert.equal(normalizeFolderUrl('https://drive.google.com/drive/u/1/folders/example_A?usp=sharing'),'https://drive.google.com/drive/folders/example_A');
 assert.equal(normalizeFolderUrl('https://drive.google.com/drive/folders/example_A?resourcekey=key_1'),'https://drive.google.com/drive/folders/example_A?resourcekey=key_1');
 assert.equal(normalizeFolderUrl(null),null);
 for(const value of ['javascript:alert(1)','https://drive.google.com.evil.test/drive/folders/a','http://drive.google.com/drive/folders/a','https://drive.google.com/file/d/a/view','https://evil@drive.google.com/drive/folders/a','https://drive.google.com:4433/drive/folders/a'])assert.throws(()=>normalizeFolderUrl(value));
});
test('new view never converts old submission or completion and leaves raw state unchanged',()=>{
 const old=normalizeProgress({completed:[1,2,3,4],checks:{'4-5-0':true,'4-5-1':true,'4-5-2':true,'4-5-3':true,'4-5-4':true,...Object.fromEntries(DRIVE_CONTENT_IDS.slice(1).map(id=>[`practice:${id}:submitted`,true]))}});
 const snapshot=JSON.stringify(old);assert.deepEqual(driveProgressView(old,{}).completed,[1,2,3]);
 assert.deepEqual(driveProgressView(old,Object.fromEntries(DRIVE_CONTENT_IDS.map(id=>[id,true]))).completed,[1,2,3,4,5,6]);
 assert.equal(JSON.stringify(old),snapshot);
});
test('additive migration, A/B authorization, persistence, undo, stale writes and admin distinction',async()=>{
 const db=new DatabaseSync(':memory:');cookieValues.clear();env.DB=d1(db);
 try {
  for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>/^000[0-2].*\.sql$/.test(n)).sort())db.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  await bootstrap.POST(request({name:'テスト管理者',pin:'2468'}));
  const a=(await (await users.POST(request({name:'利用者A',pin:'1357'}))).json()).user;
  const b=(await (await users.POST(request({name:'利用者B',pin:'1357'}))).json()).user;
  const old={completed:[1,2,3,4],checks:{'4-5-0':true,'4-5-1':true,'4-5-2':true,'4-5-3':true,'4-5-4':true,'practice:fruit:submitted':true,'step5-video-1-submitted':true}};
  await logout.POST();await login.POST(request({name:a.name,pin:'1357'}));await protectedProgressPUT(request(old));
  const beforeUsers=db.prepare('SELECT * FROM users ORDER BY id').all();const beforeProgress=db.prepare('SELECT * FROM user_progress ORDER BY user_id').all();
  db.exec(await readFile(new URL('../drizzle/0003_drive_saving.sql',import.meta.url),'utf8'));
  assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY id').all(),beforeUsers);assert.deepEqual(db.prepare('SELECT * FROM user_progress ORDER BY user_id').all(),beforeProgress);
  assert.deepEqual((await (await drive.GET()).json()).drive,{folderUrl:null,checks:{}});
  assert.equal((await protectedDrivePUT(request({contentId:'fruit',saved:true}))).status,409);
  assert.equal((await folders.GET()).status,403);assert.equal((await folders.PUT(request({userId:b.id,folderUrl:null}))).status,403);
  await logout.POST();await login.POST(request({name:'テスト管理者',pin:'2468'}));
  for(const [user,id] of [[a,'folder_A'],[b,'folder_B']])assert.equal((await folders.PUT(request({userId:user.id,folderUrl:`https://drive.google.com/drive/folders/${id}`}))).status,200);
  assert.equal((await folders.PUT(request({userId:a.id,folderUrl:'https://evil.test/folder'}))).status,400);
  assert.equal((await folders.PUT(request({userId:a.id,folderUrl:null},'https://evil.test'))).status,403);
  await logout.POST();assert.equal((await drive.GET()).status,401);assert.equal((await protectedDrivePUT(request({contentId:'fruit',saved:true}))).status,401);
  await login.POST(request({name:a.name,pin:'1357'}));
  assert.equal(JSON.stringify(await (await drive.GET()).json()).includes('folder_B'),false);
  assert.equal((await protectedDrivePUT(request({userId:b.id,contentId:'fruit',saved:true}))).status,400);
  assert.equal((await protectedDrivePUT(request({contentId:'unknown',saved:true}))).status,400);
  assert.equal((await protectedDrivePUT(request({contentId:'fruit',saved:true},'https://evil.test'))).status,403);
  for(const contentId of DRIVE_CONTENT_IDS)assert.equal((await protectedDrivePUT(request({contentId,saved:true}))).status,200);
  await protectedProgressPUT(request(old)); // Old browser submits a whole legacy snapshot; new records survive.
  await logout.POST();await login.POST(request({name:a.name,pin:'1357'}));
  assert.equal(Object.values((await (await drive.GET()).json()).drive.checks).filter(Boolean).length,11);
  assert.equal((await protectedDrivePUT(request({contentId:'fruit',saved:false}))).status,200);
  assert.equal((await (await progress.GET()).json()).progress.checks['practice:fruit:submitted'],true);
  await logout.POST();await login.POST(request({name:b.name,pin:'1357'}));assert.deepEqual((await (await drive.GET()).json()).drive.checks,{});
  await logout.POST();await login.POST(request({name:'テスト管理者',pin:'2468'}));
  const report=(await (await admin.GET()).json()).users.find(user=>user.id===a.id);
  assert.equal(report.driveStep5Count,5);assert.equal(report.driveStep6Count,4);assert.equal(report.driveStep4Saved,true);assert.equal(report.step5CompletedCount,1);assert.ok(report.oldCompleted.includes(4));
  assert.equal((await folders.PUT(request({userId:a.id,folderUrl:null}))).status,200);
  await logout.POST();await login.POST(request({name:a.name,pin:'1357'}));
  assert.equal((await protectedDrivePUT(request({contentId:'space',saved:false}))).status,200);assert.equal((await protectedDrivePUT(request({contentId:'fruit',saved:true}))).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,3);
 } finally {cookieValues.clear();delete env.DB;db.close();}
});

async function protectedProgressPUT(request){
 const read=await progress.GET();const state=await read.json();
 const headers=new Headers(request.headers);headers.set(PROGRESS_CLIENT_HEADER,PROGRESS_CLIENT);headers.set('If-Match',state.revision);
 return progress.PUT(new Request(request,{headers}));
}

async function protectedDrivePUT(request){const read=await drive.GET();const snapshot=await read.json();const headers=new Headers(request.headers);headers.set('If-Match',snapshot.revision);return drive.PUT(new Request(request,{headers}));}
