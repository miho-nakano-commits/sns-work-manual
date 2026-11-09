import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const hosting=JSON.parse(await readFile('dist/.openai/hosting.json','utf8'));
assert.equal(hosting.project_id,'appgprj_6aaca68dfe988191b848e80bb91df72e');
assert.equal(hosting.d1,'DB');assert.equal(hosting.r2,'MEDIA');
const runtime=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
assert.deepEqual(runtime.d1_databases.map(x=>x.binding),['DB']);
assert.deepEqual(runtime.r2_buckets.map(x=>x.binding),['MEDIA']);
assert.notEqual(runtime.vars?.REVIEW_MODE,'true');
assert.notEqual(runtime.vars?.MEDIA_UPLOAD_ENABLED,'true');
let count=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 const p=resolve(dir,entry.name);
 if(entry.isDirectory())await walk(p);
 else{count++;assert.ok(!/\.(mp4|mov|zip|sqlite|db)$/i.test(entry.name),p);}
}}
await walk('dist/client');
console.log(`Production artifact verified: ${count} static files; no videos, ZIPs or databases; DB/MEDIA preserved; review/upload disabled.`);
