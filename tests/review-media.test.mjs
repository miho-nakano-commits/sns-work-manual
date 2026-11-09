import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { serveMedia } from '../app/media-response.ts';
import { env, cookieValues } from './runtime-mock.mjs';
import { getD1 } from '../app/server-auth.ts';
import * as media from '../app/api/review-media/[id]/route.ts';
import * as sheet from '../app/api/analysis-sheet/route.ts';
import { mediaUrl } from '../app/media-catalog.ts';
import * as upload from '../app/api/admin/review-media/[id]/route.ts';
import { createHash } from 'node:crypto';

const bytes = new TextEncoder().encode('0123456789');
function fixture() {
  const reads = [];
  const store = {
    async head() { return { size: bytes.length, etag: 'fixture' }; },
    async read(key, offset, length) { reads.push({ key, offset, length }); return new ReadableStream({ start(c) { c.enqueue(bytes.slice(offset, offset + length)); c.close(); } }); },
  };
  return { store, reads };
}
const request = (range, method = 'GET', headers = {}) => new Request('https://review.test/api/review-media/fruit-reference', { method, headers: { ...(range ? { Range: range } : {}), ...headers } });

test('unauthenticated media never touches storage and does not disclose asset existence', async () => {
  const store = { head() { throw new Error('storage must not be read'); } };
  for (const id of ['fruit-reference', '../secret', 'unknown']) assert.equal((await serveMedia(request(), id, async () => false, store)).status, 401);
});

test('full media, HEAD and Japanese ZIP download use private authenticated responses', async () => {
  const { store, reads } = fixture();
  const response = await serveMedia(request(), 'fruit-reference', async () => true, store);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '0123456789');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Content-Type'), 'video/mp4');
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
  const head = await serveMedia(request(null, 'HEAD'), 'fruit-images', async () => true, store);
  assert.equal(head.headers.get('Content-Length'), '10');
  assert.equal(await head.text(), '');
  assert.equal(reads.length, 1);
  assert.match(head.headers.get('Content-Disposition'), /^attachment;/);
  assert.ok(decodeURIComponent(head.headers.get('Content-Disposition')).includes('フルーツ雑学_編集画像.zip'));
});

test('seeks support bounded, open-ended and suffix byte ranges without reading whole files', async () => {
  for (const [range, expected, offset, length] of [['bytes=2-4','234',2,3], ['bytes=7-','789',7,3], ['bytes=-3','789',7,3], ['bytes=8-100','89',8,2]]) {
    const { store, reads } = fixture();
    const response = await serveMedia(request(range), 'seasons-reference', async () => true, store);
    assert.equal(response.status, 206);
    assert.equal(await response.text(), expected);
    assert.equal(response.headers.get('Content-Range'), `bytes ${offset}-${offset + length - 1}/10`);
    assert.deepEqual(reads, [{ key: 'step5/seasons/reference.mp4', offset, length }]);
  }
});

test('bad ranges are rejected; If-Range mismatches return full content', async () => {
  for (const range of ['bytes=10-', 'bytes=4-2', 'bytes=-0', 'bytes=0-1,4-5', 'items=0-1', 'bytes=9007199254740992-']) {
    const { store, reads } = fixture();
    const response = await serveMedia(request(range), 'fruit-reference', async () => true, store);
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('Content-Range'), 'bytes */10');
    assert.equal(reads.length, 0);
  }
  const { store } = fixture();
  const response = await serveMedia(request('bytes=2-4','GET',{'If-Range':'"old"'}), 'fruit-reference', async () => true, store);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '0123456789');
});

test('allowlist rejects caller-selected paths and missing storage never falls back to public media', async () => {
  for (const id of ['../.env','step5/fruit/reference.mp4','https://example.test']) assert.equal((await serveMedia(request(), id, async () => true, fixture().store)).status, 404);
  assert.equal((await serveMedia(request(), 'fruit-reference', async () => true, undefined)).status, 503);
});

test('review bindings and cookies stay isolated; R2 route uses authenticated ranged reads', async () => {
  env.DB = { production: true };
  env.REVIEW_MODE = 'true';
  assert.throws(() => getD1(), /refusing production fallback/);
  env.REVIEW_DB = { prepare() { return { bind() { return { async first() { return { id:'review-fixture',name:'確認',role:'user' }; } }; } }; } };
  assert.equal(getD1(), env.REVIEW_DB);
  const ranges = [];
  env.REVIEW_MEDIA = { async head() { return { size:10,etag:'fixture' }; }, async get(key, options) { ranges.push({key,...options.range}); return {body:await fixture().store.read(key,options.range.offset,options.range.length)}; } };
  const context = { params: Promise.resolve({ id:'fruit-reference' }) };
  try {
    cookieValues.set('sns_manual_session','production-cookie');
    assert.equal((await media.GET(request(), context)).status,401);
    cookieValues.set('sns_manual_review_session','review-fixture-token');
    const response = await media.GET(request('bytes=3-5'), context);
    assert.equal(response.status,206);
    assert.equal(await response.text(),'345');
    assert.deepEqual(ranges,[{key:'step5/fruit/reference.mp4',offset:3,length:3}]);
    delete env.REVIEW_MEDIA;
    assert.equal((await media.GET(request(), context)).status,503);
    env.REVIEW_MODE='false';
    assert.equal((await media.GET(request(), context)).status,404);
    assert.equal(getD1(),env.DB);
  } finally { cookieValues.clear(); for(const key of ['DB','REVIEW_DB','REVIEW_MODE','REVIEW_MEDIA']) delete env[key]; }
});

test('review Google endpoint blocks before any outbound call, even with production secrets present', async () => {
  env.REVIEW_MODE='true';
  env.REVIEW_DB = { prepare() { return { bind() { return { async first() { return {id:'test',role:'user'}; } }; } }; } };
  env.ANALYSIS_SHEET_WEB_APP_URL='https://script.google.com/macros/s/fixture/exec';
  env.ANALYSIS_SHEET_API_SECRET='synthetic-test-only';
  cookieValues.set('sns_manual_review_session','synthetic-token');
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('No outbound requests allowed');};
  try { const response=await sheet.POST();assert.equal(response.status,403);assert.equal((await response.json()).code,'REVIEW_DISABLED');assert.equal(calls,0); }
  finally { globalThis.fetch=originalFetch;cookieValues.clear();for(const key of ['REVIEW_MODE','REVIEW_DB','ANALYSIS_SHEET_WEB_APP_URL','ANALYSIS_SHEET_API_SECRET'])delete env[key]; }
});

test('review UI URLs and configuration cannot reference the production site identity', async () => {
  const prior=process.env.NEXT_PUBLIC_REVIEW_MODE;
  process.env.NEXT_PUBLIC_REVIEW_MODE='true';
  try { assert.equal(mediaUrl('/step5/fruit/reference.mp4'),'/api/review-media/fruit-reference');assert.throws(()=>mediaUrl('/secret')); env.DB={production:true};assert.throws(()=>getD1(),/refusing production fallback/); }
  finally { delete env.DB;if(prior===undefined)delete process.env.NEXT_PUBLIC_REVIEW_MODE;else process.env.NEXT_PUBLIC_REVIEW_MODE=prior; }
  const config=JSON.parse(await readFile(new URL('../.openai/hosting.review.json',import.meta.url),'utf8'));
  assert.equal(config.project_id,undefined);
  assert.equal(config.d1,'REVIEW_DB');assert.equal(config.r2,'REVIEW_MEDIA');
});

test('prepared upload is review-only, administrator-only, checksum-checked and cannot overwrite', async () => {
  let role='user', stored=false, puts=0;
  env.REVIEW_MODE='true';
  env.REVIEW_DB={prepare(){return{bind(){return{async first(){return{id:'synthetic-admin',role};}};}};}};
  cookieValues.set('sns_manual_review_session','synthetic-token');
  const original=await readFile(new URL('../public/step4-audio-material.mp4',import.meta.url));
  const context={params:Promise.resolve({id:'step4-audio'})};
  const make=(origin='https://review.test')=>new Request('https://review.test/api/admin/review-media/step4-audio',{method:'PUT',headers:{Origin:origin,'Content-Length':String(original.length)},body:original});
  env.REVIEW_MEDIA={async head(){return stored?{size:original.length}:null;},async put(key,body,options){
    puts++;assert.equal(key,'step4-audio-material.mp4');assert.equal(options.onlyIf.etagDoesNotMatch,'*');
    const bytes=Buffer.from(await new Response(body).arrayBuffer());
    assert.deepEqual(Buffer.from(options.sha256),createHash('sha256').update(bytes).digest());
    stored=true;return{size:bytes.length};
  }};
  try{
    assert.equal((await upload.PUT(make(),context)).status,403);assert.equal(puts,0);
    role='admin';
    assert.equal((await upload.PUT(make('https://other.test'),context)).status,403);
    assert.equal((await upload.PUT(make(),context)).status,201);
    assert.equal((await upload.PUT(make(),context)).status,409);assert.equal(puts,1);
    delete env.REVIEW_MEDIA;assert.equal((await upload.PUT(make(),context)).status,503);
    env.REVIEW_MODE='false';assert.equal((await upload.PUT(make(),context)).status,404);
  }finally{cookieValues.clear();for(const key of ['REVIEW_MODE','REVIEW_DB','REVIEW_MEDIA'])delete env[key];}
});
