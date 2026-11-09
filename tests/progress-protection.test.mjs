import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {env,cookieValues} from './runtime-mock.mjs';
import {createSession} from '../app/server-auth.ts';
import * as progress from '../app/api/progress/route.ts';
import {PROGRESS_CLIENT,PROGRESS_CLIENT_HEADER} from '../app/progress-protocol.ts';
import {ProgressSaveController} from '../app/progress-save-controller.ts';
import {initialState} from '../app/progress.ts';

const compatibility=PROGRESS_CLIENT.endsWith('compatibility');
const advancedChecks=Object.fromEntries(['fruit','sweets-house','quiz','space','future','tidying','seasons','psychology','dream-home','healing'].map(id=>[`practice:${id}:submitted`,true]));
async function fixture(){
 const db=new DatabaseSync(':memory:');let beforeWrite=null;const writes=[];
 for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>/^\d+.*\.sql$/.test(x)).sort())db.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 db.prepare("INSERT INTO users (id,name,pin_salt,pin_hash,role,active) VALUES ('learner','Synthetic learner','keep-salt','keep-pin-hash','user',1)").run();
 db.prepare("INSERT INTO user_progress (user_id,current_step,completed_steps,positions,checks,form_values,last_worked_step,updated_at) VALUES ('learner',6,?,?,?,?,6,'2000-01-01 00:00:00')").run('[1,4,5,6]',JSON.stringify({1:2,5:1,6:2}),JSON.stringify({...advancedChecks,'1-8-0':false}),JSON.stringify({analysisSheetUrl:'https://example.test/retained',practiceStep6ContentId:'healing',untouched:'retained'}));
 env.DB={prepare(sql){const stmt=db.prepare(sql);const bound=(values=[])=>({bind:(...args)=>bound(args),first:async()=>stmt.get(...values)??null,all:async()=>({results:stmt.all(...values)}),run:async()=>{writes.push(sql);if(beforeWrite){const callback=beforeWrite;beforeWrite=null;callback(sql);}const result=stmt.run(...values);return{meta:{changes:Number(result.changes)}};}});return bound();}};
 cookieValues.clear();await createSession('learner');writes.length=0;
 return{db,writes,beforeWrite:fn=>{beforeWrite=fn;},row:()=>db.prepare("SELECT * FROM user_progress WHERE user_id='learner'").get(),users:()=>db.prepare('SELECT * FROM users').all(),close(){db.close();delete env.DB;cookieValues.clear();}};
}
async function read(){return(await progress.GET()).json();}
const put=(body,revision,client=PROGRESS_CLIENT)=>progress.PUT(new Request('https://local.test/api/progress',{method:'PUT',headers:{'Content-Type':'application/json',[PROGRESS_CLIENT_HEADER]:client,...(revision?{'If-Match':revision}:{})},body:JSON.stringify(body)}));

test('reads and exact no-op saves leave raw progress bytes, timestamp and account/PIN untouched',async()=>{
 const f=await fixture();try{const before=f.row(),users=f.users();const snapshot=await read();assert.deepEqual(f.row(),before);assert.equal(f.writes.length,0);
 const response=await put(snapshot.progress,snapshot.revision);assert.equal(response.status,200);assert.equal((await response.json()).unchanged,true);assert.deepEqual(f.row(),before);assert.equal(f.writes.length,0);assert.deepEqual(f.users(),users);
 }finally{f.close();}
});
test('old pages, wrong application version, and missing revision cannot write any progress',async()=>{
 const f=await fixture();try{const before=f.row(),snapshot=await read();const body={...snapshot.progress,currentStep:1,checks:{}};
 for(const client of ['',compatibility?'sns-progress-v2-release':'sns-progress-v2-compatibility'])assert.equal((await put(body,snapshot.revision,client)).status,426);
 assert.equal((await put(body,null)).status,428);assert.deepEqual(f.row(),before);assert.equal(f.writes.length,0);
 }finally{f.close();}
});
test('a second tab cannot overwrite a newer snapshot even within the same second',async()=>{
 const f=await fixture();try{const stale=await read();const newer={...stale.progress,checks:{...stale.progress.checks,'1-8-0':true}};
 assert.equal((await put(newer,stale.revision)).status,200);const accepted=f.row();
 assert.equal((await put({...stale.progress,currentStep:2},stale.revision)).status,412);assert.deepEqual(f.row(),accepted);
 }finally{f.close();}
});
test('compare-and-swap prevents a write racing between validation and the SQL update',async()=>{
 const f=await fixture();try{const snapshot=await read();
 f.beforeWrite(()=>f.db.prepare("UPDATE user_progress SET form_values=?,updated_at='2000-01-01 00:00:00' WHERE user_id='learner'").run(JSON.stringify({external:'newer-data'})));
 assert.equal((await put({...snapshot.progress,checks:{...snapshot.progress.checks,'1-8-0':true}},snapshot.revision)).status,412);
 assert.deepEqual(JSON.parse(f.row().form_values),{external:'newer-data'});
 }finally{f.close();}
});
test('simultaneous requests with one revision accept only one different change',async()=>{
 const f=await fixture();try{const snapshot=await read();const a={...snapshot.progress,checks:{...snapshot.progress.checks,'1-8-0':true}},b={...snapshot.progress,form:{...snapshot.progress.form,analysisSheetUrl:'https://example.test/new'}};
 const responses=await Promise.all([put(a,snapshot.revision),put(b,snapshot.revision)]);assert.deepEqual(responses.map(x=>x.status).sort(),[200,412]);
 }finally{f.close();}
});
test('compatibility saves preserve all advanced fields while allowing a Step1 edit',async()=>{
 const f=await fixture();try{const snapshot=await read();const before=f.row();
 const body=compatibility?{completed:[1],position:{1:3},checks:{'1-8-0':true},form:{analysisSheetUrl:'https://example.test/new'},currentStep:1,lastWorkedStep:1}:{...snapshot.progress,checks:{...snapshot.progress.checks,'1-8-0':true}};
 assert.equal((await put(body,snapshot.revision)).status,200);const after=f.row();
 for(const id of [5,6])assert.ok(JSON.parse(after.completed_steps).includes(id));
 assert.equal(JSON.parse(after.positions)[6],JSON.parse(before.positions)[6]);assert.equal(JSON.parse(after.checks)['practice:healing:submitted'],true);
 assert.equal(JSON.parse(after.form_values).practiceStep6ContentId,'healing');assert.equal(after.current_step,6);assert.equal(after.last_worked_step,6);assert.equal(JSON.parse(after.checks)['1-8-0'],true);
 assert.equal(f.users()[0].pin_hash,'keep-pin-hash');
 }finally{f.close();}
});
test('initial observation, identical state, retry and flush send no request or draft',async()=>{
 let requests=0,drafts=0;const controller=new ProgressSaveController(initialState,'"baseline"',async()=>{requests++;return{ok:true,status:200,revision:'"next"'};},()=>drafts++,()=>{});
 controller.observe({...initialState});for(let i=0;i<3;i++)assert.equal(await controller.flush(),true);assert.equal(requests,0);assert.equal(drafts,0);
});
test('queued learner edits use the acknowledged revision; a conflict stops queued and later retries',async()=>{
 const revisions=[],retained=[];let calls=0,release;
 const gate=new Promise(resolve=>{release=resolve;});
 const controller=new ProgressSaveController(initialState,'"r1"',async(value,revision)=>{revisions.push(revision);calls++;if(calls===1){await gate;return{ok:true,status:200,revision:'"r2"'};}return{ok:false,status:412};},value=>retained.push(value),()=>{});
 controller.observe({...initialState,currentStep:2});const first=controller.flush();controller.observe({...initialState,currentStep:3});const second=controller.flush();release();assert.equal(await first,true);assert.equal(await second,false);assert.deepEqual(revisions,['"r1"','"r2"']);
 controller.observe({...initialState,currentStep:4});assert.equal(await controller.flush(),false);assert.equal(calls,2);assert.equal(retained.at(-1).currentStep,4);
});
