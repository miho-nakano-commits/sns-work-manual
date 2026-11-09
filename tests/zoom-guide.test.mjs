import test from 'node:test';
import assert from 'node:assert/strict';
import {env,cookieValues} from './runtime-mock.mjs';
import {ZOOM_GUIDE_ASSET,MEDIA_ASSETS,mediaUrl} from '../app/media-catalog.ts';
import * as media from '../app/api/media/[id]/route.ts';

test('supplementary zoom video requires a session, supports range and HEAD, and never writes progress',async()=>{
 const key='guides/zoom-operation.mp4';let storageReads=0,dbReads=0;
 env.DB={prepare(sql){assert.match(sql,/^SELECT u.id/);dbReads++;return{bind(){return{first:async()=>({id:'synthetic-guide-user',role:'user'})};}};}};
 env.MEDIA={async head(object){assert.equal(object,key);storageReads++;return{size:10,etag:'zoom-fixture'};},async get(object,{range}){assert.equal(object,key);assert.deepEqual(range,{offset:2,length:3});return{body:new Response('234').body};}};
 const context={params:Promise.resolve({id:ZOOM_GUIDE_ASSET.id})};
 const request=(method='GET',headers={})=>new Request('https://local.test/api/media/'+ZOOM_GUIDE_ASSET.id,{method,headers});
 try{
  assert.equal(MEDIA_ASSETS.length,24,'Existing curriculum asset collection stays intact');
  assert.equal(mediaUrl(ZOOM_GUIDE_ASSET.path),'/api/media/zoom-operation-guide');
  assert.equal((await media.GET(request(),context)).status,401);assert.equal(storageReads,0);assert.equal(dbReads,0);
  cookieValues.set('sns_manual_session','synthetic-token');
  const range=await media.GET(request('GET',{Range:'bytes=2-4'}),context);
  assert.equal(range.status,206);assert.equal(await range.text(),'234');assert.equal(range.headers.get('Content-Range'),'bytes 2-4/10');assert.equal(range.headers.get('Cache-Control'),'private, no-store');
  const head=await media.HEAD(request('HEAD'),context);assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),'10');assert.equal(await head.text(),'');assert.match(head.headers.get('Content-Disposition'),/filename\*=UTF-8/);
  assert.equal(dbReads,2,'Only session lookups are made; there is no progress query or write');
 }finally{delete env.DB;delete env.MEDIA;cookieValues.clear();}
});

import * as placement from '../app/api/admin/zoom-setup/route.ts';
import ClosedPage from '../app/zoom-setup/page.tsx';
test('final release closes temporary placement before any DB or storage access',async()=>{
 env.DB={prepare(){throw Error('must not access DB');}};env.MEDIA={put(){throw Error('must not write R2');}};cookieValues.set('sns_manual_session','synthetic-admin');
 try{assert.equal((await placement.PUT(new Request('https://local.test/api/admin/zoom-setup',{method:'PUT',body:'untrusted'}))).status,404);assert.throws(()=>ClosedPage(),e=>e.status===404);}
 finally{delete env.DB;delete env.MEDIA;cookieValues.clear();}
});
