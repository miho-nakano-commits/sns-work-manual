import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {env,cookieValues} from './runtime-mock.mjs';
import {MEDIA_ASSETS} from '../app/media-catalog.ts';
import * as media from '../app/api/media/[id]/route.ts';
import * as upload from '../app/api/admin/media/[id]/route.ts';
import {createHash} from 'node:crypto';
const context=id=>({params:Promise.resolve({id})});
test('preparation retains the exact published UI, authentication, schema and all three applied migrations',async()=>{
 const hashes=JSON.parse(await readFile('tests/published-baseline.json','utf8'));
 for(const [p,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(p)).digest('hex'),hash,p);
 assert.equal((await readdir('drizzle')).some(x=>x.startsWith('0003')),false);
});
test('media routes authenticate without DB writes; fixed checksums and conditional writes prevent corruption/overwrite',async()=>{
 let role='user',reads=0,stored=false,puts=0;
 env.DB={prepare(sql){assert.match(sql,/^SELECT u.id/);return{bind(){return{async first(){return{id:'fixture',name:'Fixture',role};}};}};}};
 const bytes=await readFile('public/step4-audio-material.mp4');
 env.MEDIA={async head(){reads++;return stored?{size:bytes.length,etag:'test'}:null;},async put(key,body,options){
  puts++;assert.equal(key,'step4-audio-material.mp4');assert.equal(options.onlyIf.etagDoesNotMatch,'*');
  assert.deepEqual(Buffer.from(options.sha256),createHash('sha256').update(Buffer.from(await new Response(body).arrayBuffer())).digest());stored=true;return{size:bytes.length};
 },async get(key,{range}){return{body:new Response(bytes.subarray(range.offset,range.offset+range.length)).body};}};
 const request=()=>new Request('https://manual.test/api/admin/media/step4-audio',{method:'PUT',headers:{Origin:'https://manual.test','Content-Length':String(bytes.length)},body:bytes});
 try{
  for(const a of MEDIA_ASSETS)assert.equal((await media.GET(new Request('https://manual.test/api/media/'+a.id),context(a.id))).status,401);
  assert.equal(reads,0);assert.equal((await upload.PUT(request(),context('step4-audio'))).status,401);
  cookieValues.set('sns_manual_session','synthetic-token');assert.equal((await upload.PUT(request(),context('step4-audio'))).status,403);
  role='admin';assert.equal((await upload.PUT(request(),context('step4-audio'))).status,201);
  assert.equal((await upload.PUT(request(),context('step4-audio'))).status,409);assert.equal(puts,1);
  const range=await media.GET(new Request('https://manual.test/api/media/step4-audio',{headers:{Range:'bytes=0-15'}}),context('step4-audio'));
  assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(0,16));
 }finally{cookieValues.clear();delete env.DB;delete env.MEDIA;}
});
