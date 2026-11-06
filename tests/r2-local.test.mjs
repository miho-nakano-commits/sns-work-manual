import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
const {Miniflare}=createRequire(realpathSync(new URL('../node_modules/wrangler/package.json',import.meta.url)))('miniflare');
import {env,cookieValues} from './runtime-mock.mjs';
import * as upload from '../app/api/admin/media/[id]/route.ts';
import * as media from '../app/api/media/[id]/route.ts';
test('local R2 enforces the SHA256, streams exact bytes, supports HEAD/Range and prevents concurrent overwrite',async()=>{
 const mf=new Miniflare({modules:true,script:`export default {async fetch(request,env){try{const result=await env.MEDIA.put(new URL(request.url).pathname.slice(1),request.body,{onlyIf:{etagDoesNotMatch:'*'},sha256:request.headers.get('X-Expected-SHA256')});return new Response(null,{status:result?201:409});}catch(error){return new Response(error.message,{status:400});}}}`,r2Buckets:['MEDIA'],r2Persist:false});
 try{
  const bucket=await mf.getR2Bucket('MEDIA');
  // Native Node streams have no Workers length metadata. Send the unchanged
  // stream through an incoming Workers request, as the deployed route receives it.
  env.MEDIA={head:key=>bucket.head(key),get:(key,options)=>bucket.get(key,options),async put(key,body,options){
   assert.equal(options.onlyIf.etagDoesNotMatch,'*');
   const response=await mf.dispatchFetch('http://storage.test/'+key,{method:'PUT',headers:{'Content-Length':'324747','X-Expected-SHA256':Buffer.from(options.sha256).toString('hex')},body,duplex:'half'});
   if(response.status===409)return null;
   if(response.status!==201)throw Error(await response.text());
   return bucket.head(key);
  }};
  env.DB={prepare(sql){assert.match(sql,/^SELECT u.id/);return{bind(){return{async first(){return{id:'synthetic-admin',role:'admin'};}};}};}};
  cookieValues.set('sns_manual_session','synthetic-token');
  const bytes=await readFile('public/step4-audio-material.mp4');
  const context={params:Promise.resolve({id:'step4-audio'})};
  const make=data=>new Request('https://manual.test/api/admin/media/step4-audio',{method:'PUT',headers:{Origin:'https://manual.test','Content-Length':String(data.length)},body:data});
  const damaged=Buffer.from(bytes);damaged[20]^=1;
  assert.equal((await upload.PUT(make(damaged),context)).status,400);
  assert.equal(await env.MEDIA.head('step4-audio-material.mp4'),null);
  const attempts=await Promise.all([upload.PUT(make(bytes),context),upload.PUT(make(bytes),context)]);
  assert.deepEqual(attempts.map(x=>x.status).sort(),[201,409]);
  const full=await media.GET(new Request('https://manual.test/api/media/step4-audio'),context);
  assert.equal(full.status,200);assert.equal(createHash('sha256').update(Buffer.from(await full.arrayBuffer())).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
  const ranged=await media.GET(new Request('https://manual.test/api/media/step4-audio',{headers:{Range:'bytes=100-115'}}),context);
  assert.equal(ranged.status,206);assert.deepEqual(Buffer.from(await ranged.arrayBuffer()),bytes.subarray(100,116));
  const head=await media.HEAD(new Request('https://manual.test/api/media/step4-audio',{method:'HEAD'}),context);assert.equal(head.headers.get('Content-Length'),String(bytes.length));assert.equal(await head.text(),'');
 }finally{delete env.DB;delete env.MEDIA;cookieValues.clear();await mf.dispose();}
});
