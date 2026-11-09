import test from 'node:test';
import assert from 'node:assert/strict';
import {env,cookieValues} from './runtime-mock.mjs';
import {ZOOM_SETUP_BYTES,ZOOM_SETUP_EXPIRY,ZOOM_SETUP_SHA256} from '../app/zoom-setup-config.ts';
import * as setup from '../app/api/admin/zoom-setup/route.ts';
import SetupPage from '../app/zoom-setup/page.tsx';
test('temporary single-video placement expires, authenticates, checks origin/length, pins checksum and never overwrites or writes DB',async()=>{
 let role='user',stored=false,puts=0,dbReads=0;
 env.DB={prepare(sql){assert.match(sql,/^SELECT u.id/);dbReads++;return{bind(){return{first:async()=>({id:'synthetic',role})};}};}};
 env.MEDIA={async head(key){assert.equal(key,'guides/zoom-operation.mp4');return stored?{size:ZOOM_SETUP_BYTES}:null;},async put(key,body,options){puts++;assert.equal(key,'guides/zoom-operation.mp4');assert.equal(options.onlyIf.etagDoesNotMatch,'*');assert.equal(Buffer.from(options.sha256).toString('hex'),ZOOM_SETUP_SHA256);assert.equal(options.httpMetadata.contentType,'video/mp4');stored=true;return{size:ZOOM_SETUP_BYTES};}};
 const request=(headers={})=>new Request('https://local.test/api/admin/zoom-setup',{method:'PUT',headers:{Origin:'https://local.test','Content-Length':String(ZOOM_SETUP_BYTES),'Content-Type':'video/mp4',...headers},body:'synthetic transport body'});
 const now=Date.now;
 try{
  assert.equal((await setup.PUT(request())).status,401);assert.equal(dbReads,0);await assert.rejects(SetupPage(),e=>e.status===404);
  cookieValues.set('sns_manual_session','synthetic');assert.equal((await setup.PUT(request())).status,403);await assert.rejects(SetupPage(),e=>e.status===404);
  role='admin';assert.equal((await SetupPage()).type,'main');assert.equal((await setup.PUT(request({Origin:'https://other.test'}))).status,403);
  assert.equal((await setup.PUT(request({'Content-Length':'1'}))).status,400);assert.equal((await setup.PUT(request({'Content-Type':'text/plain'}))).status,400);assert.equal(puts,0);
  assert.equal((await setup.PUT(request())).status,201);assert.equal(puts,1);assert.equal((await setup.PUT(request())).status,409);assert.equal(puts,1);
  Date.now=()=>Date.parse(ZOOM_SETUP_EXPIRY)+1;assert.equal((await setup.PUT(request())).status,410);assert.equal(puts,1);
 }finally{Date.now=now;delete env.DB;delete env.MEDIA;cookieValues.clear();}
});
