import assert from 'node:assert/strict';import test from 'node:test';import {DatabaseSync} from 'node:sqlite';import {readFile,readdir} from 'node:fs/promises';
import {env,cookieValues} from './runtime-mock.mjs';import {createSession} from '../app/server-auth.ts';import * as drive from '../app/api/drive/route.ts';import {PROGRESS_CLIENT,PROGRESS_CLIENT_HEADER} from '../app/progress-protocol.ts';
test('Drive completion rejects stale snapshots and preserves records after application rollback',async()=>{
 const db=new DatabaseSync(':memory:');
 for(const file of (await readdir('drizzle')).filter(x=>/^\d+.*\.sql$/.test(x)).sort())db.exec(await readFile('drizzle/'+file,'utf8'));
 db.prepare("INSERT INTO users (id,name,pin_salt,pin_hash,role,active) VALUES ('fixture','Fixture','retained-salt','retained-pin','user',1)").run();
 db.prepare("INSERT INTO user_drive_settings (user_id,folder_url) VALUES ('fixture','https://drive.google.com/drive/folders/test')").run();
 env.DB={prepare(sql){const s=db.prepare(sql);const bind=(values=[])=>({bind:(...args)=>bind(args),first:async()=>s.get(...values)??null,all:async()=>({results:s.all(...values)}),run:async()=>{const result=s.run(...values);return{meta:{changes:Number(result.changes)}};}});return bind();}};
 const put=(saved,revision,client=PROGRESS_CLIENT)=>drive.PUT(new Request('https://local.test/api/drive',{method:'PUT',headers:{'Content-Type':'application/json',[PROGRESS_CLIENT_HEADER]:client,...(revision?{'If-Match':revision}:{})},body:JSON.stringify({contentId:'healing',saved})}));
 try{await createSession('fixture');const before=await(await drive.GET()).json();
  if(PROGRESS_CLIENT.endsWith('compatibility')){
   db.prepare("INSERT INTO drive_save_progress (user_id,content_id,saved) VALUES ('fixture','healing',1)").run();const retained=db.prepare('SELECT * FROM drive_save_progress').all();
   assert.equal((await put(false,before.revision)).status,426);assert.deepEqual(db.prepare('SELECT * FROM drive_save_progress').all(),retained);
  }else{
   assert.equal((await put(true,before.revision,'')).status,426);assert.equal((await put(true,null)).status,428);
   assert.equal((await put(true,before.revision)).status,200);const retained=db.prepare('SELECT * FROM drive_save_progress').all();
   assert.equal((await put(false,before.revision)).status,412);assert.deepEqual(db.prepare('SELECT * FROM drive_save_progress').all(),retained);
   const fresh=await(await drive.GET()).json();assert.equal((await put(true,fresh.revision)).status,200);assert.deepEqual(db.prepare('SELECT * FROM drive_save_progress').all(),retained);
  }
  assert.equal(db.prepare("SELECT pin_hash FROM users WHERE id='fixture'").get().pin_hash,'retained-pin');
 }finally{delete env.DB;cookieValues.clear();db.close();}
});
