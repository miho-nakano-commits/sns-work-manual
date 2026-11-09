import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function checkReviewArtifact(directory = "dist-review") {
  const hosting = JSON.parse(await readFile(resolve(directory, ".openai/hosting.json"), "utf8"));
  assert.equal(hosting.project_id, undefined, "Stage A must not contain a Site ID");
  assert.equal(hosting.d1, "REVIEW_DB"); assert.equal(hosting.r2, "REVIEW_MEDIA");
  const runtime = JSON.parse(await readFile(resolve(directory, "server/wrangler.json"), "utf8"));
  assert.equal(runtime.vars.REVIEW_MODE, "true");
  assert.deepEqual(runtime.d1_databases.map(d => d.binding), ["REVIEW_DB"]);
  assert.deepEqual(runtime.r2_buckets.map(d => d.binding), ["REVIEW_MEDIA"]);
  assert.ok(!runtime.vars.ANALYSIS_SHEET_API_SECRET && !runtime.vars.ANALYSIS_SHEET_WEB_APP_URL);
  async function walk(path) {
    for (const item of await readdir(path, { withFileTypes: true })) {
      const child = resolve(path, item.name);
      if (item.isDirectory()) await walk(child);
      else assert.ok(!/\.(mp4|mov|zip)$/i.test(item.name), `Private media leaked into static build: ${child}`);
    }
  }
  await walk(resolve(directory, "client"));
  console.log("Review artifact verified: no Site ID, isolated bindings, Google secrets absent, no public video/ZIP copies.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkReviewArtifact();
