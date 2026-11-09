import assert from 'node:assert/strict';
import test from 'node:test';
import { env, cookieValues } from './runtime-mock.mjs';
import { MEDIA_ASSETS, mediaUrl } from '../app/media-catalog.ts';
import * as media from '../app/api/media/[id]/route.ts';
import * as upload from '../app/api/admin/media/[id]/route.ts';

const context=id=>({params:Promise.resolve({id})});
const request=(method='GET',headers={},body)=>new Request('https://manual.test/api/media/step4-audio',{method,headers,body});
const cleanup=()=>{cookieValues.clear();for(const key of Object.keys(env))delete env[key];};
test('all production media require a valid production session, use private R2 ranges and never use review storage',async()=>{
 let reads=0;
 env.REVIEW_MEDIA={head(){throw Error('must not read review storage');}};
 env.MEDIA={async head(){reads++;return{size:10,etag:'test'};},async get(key,{range}){assert.equal(range.offset,2);assert.equal(range.length,3);return{body:new Response('234').body};}};
 env.DB={prepare(){return{bind(){return{async first(){return{id:'fixture',role:'user'};}};}};}};
 try{
  for(const asset of MEDIA_ASSETS){
   assert.equal(mediaUrl(asset.path),'/api/media/'+asset.id);
   assert.equal((await media.GET(request(),context(asset.id))).status,401);
  }
  assert.equal(reads,0);
  cookieValues.set('sns_manual_review_session','review-token');
  assert.equal((await media.GET(request(),context('step4-audio'))).status,401);
  cookieValues.set('sns_manual_session','synthetic-token');
  const response=await media.GET(request('GET',{Range:'bytes=2-4'}),context('step4-audio'));
  assert.equal(response.status,206);assert.equal(await response.text(),'234');
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  const head=await media.HEAD(request('HEAD'),context('step4-images'));
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.match(head.headers.get('Content-Disposition'),/filename\*=UTF-8/);
  delete env.MEDIA;assert.equal((await media.GET(request(),context('step4-audio'))).status,503);
  env.REVIEW_MODE='true';assert.equal((await media.GET(request(),context('step4-audio'))).status,404);
 }finally{cleanup();}
});
test('final release closes placement even for administrators and stale runtime flags',async()=>{
 env.MEDIA_UPLOAD_ENABLED='true';
 env.DB={prepare(){throw Error('final upload must not access DB');}};
 env.MEDIA={put(){throw Error('final upload must not access storage');}};
 cookieValues.set('sns_manual_session','synthetic-admin-token');
 try {assert.equal((await upload.PUT(request('PUT',{},'untrusted'),context('step4-audio'))).status,404);}
 finally{cleanup();}
});
