import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ALL_PRACTICE_VIDEOS } from "../app/step-five-materials.ts";
import { MEDIA_ASSETS } from "../app/media-catalog.ts";

const originals = {
  "step4-reference.mp4": "4ed97667281583bfa6d73a19d94411ec38fa5c6b",
  "step4-operation-guide.mp4": "3ea614b89126ca4e4d5ef16bbd9dc5fc70cfcc42",
  "step4-image-materials.zip": "1f3689c4ac73ef895a196bf43290c70524591a3b",
  "step4-audio-material.mp4": "7ba07bae2d4d80843984bf0726583e4b84375714",
  "sns-quest-hero.png": "3985d5b1f10793e45ff2214c678d36a7e91366ae",
};
test("all existing main media files retain their original Git content hashes", async () => {
  for (const [name, expected] of Object.entries(originals)) {
    const bytes = await readFile(new URL(`../public/${name}`, import.meta.url));
    const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(hash, expected, name);
    if (name.endsWith(".mp4")) {
      assert.equal(bytes.toString("ascii", 4, 8), "ftyp");
      assert.match(bytes.toString("ascii", 8, 32), /isom|mp4/);
    }
  }
});

test("all 24 protected review assets match their retained original bytes", async () => {
  const manifest = JSON.parse(await readFile(new URL('../review/media-manifest.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(manifest).length, 24);
  for (const asset of MEDIA_ASSETS) {
    const bytes = await readFile(new URL('../public' + asset.path, import.meta.url));
    assert.equal(bytes.length, manifest[asset.id].bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest[asset.id].sha256);
  }
});

test("registered Step5 files match the received topics and retained healing originals", async () => {
  const manifest = JSON.parse(await readFile(new URL('../docs/step5-collection-assets.json', import.meta.url), 'utf8'));
  assert.equal(manifest.length, 9);
  for (const entry of manifest) {
    const registered = ALL_PRACTICE_VIDEOS[entry.id - 1];
    assert.equal(registered.title, entry.title);
    assert.equal('public' + registered.editingMaterials[0].href, entry.editingZip.file);
    assert.equal('public' + registered.referenceVideo.src, entry.referencePlayback.file);
    for (const item of [entry.editingZip, entry.referenceOriginal, entry.referencePlayback]) {
      const bytes = await readFile(new URL('../' + item.file, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
      if (item === entry.referencePlayback) {
        assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
        assert.ok(bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')));
      }
    }
  }
  const healing = JSON.parse(await readFile(new URL('../docs/step5-video1-assets.json', import.meta.url), 'utf8'));
  for (const item of [...healing.images, healing.referenceOriginal, healing.referencePlayback]) {
    const bytes = await readFile(new URL('../' + item.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
  }
});
