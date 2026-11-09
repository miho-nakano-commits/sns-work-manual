import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { checkReviewArtifact } from "./check-review-artifact.mjs";
const command = process.argv[2];
if (!["dev", "build"].includes(command)) throw new Error("Review preparation supports dev/build only; no deployment command.");
let port = "4173";
if (command === "dev" && process.argv.length > 3) {
  if (process.argv[3] !== "--port" || process.argv.length !== 5 || !/^\d+$/.test(process.argv[4])) throw new Error("Only --port is supported. Review stays on 127.0.0.1.");
  port = process.argv[4];
}
const args = command === "dev" ? ["dev", "--hostname", "127.0.0.1", "--port", port] : ["build"];
const root = process.cwd();
const context = resolve(root, "work/review-build-context");
const output = resolve(root, "dist-review");
// vinext's CLI fixes output to cwd/dist. Build in a clean, separate source
// context instead of ever overwriting root/dist or its production manifest.
const safeRemove = async target => {
  if (![context, output].includes(target) || !target.startsWith(root + sep)) throw new Error("Unsafe build cleanup target");
  await rm(target, { recursive: true, force: true });
};
if (command === "build") {
  await safeRemove(context);
  await mkdir(context, { recursive: true });
  for (const name of ["app", "build", "db", "drizzle", "worker", "scripts", "review", "package.json", "vite.config.ts", "next.config.ts", "tsconfig.json", "postcss.config.mjs"]) await cp(resolve(root, name), resolve(context, name), { recursive: true });
  await mkdir(resolve(context, ".openai"));
  const manifest = await readFile(resolve(root, ".openai/hosting.review.json"));
  if (JSON.parse(manifest).project_id) throw new Error("Stage A must not contain a Site ID");
  await writeFile(resolve(context, ".openai/hosting.json"), manifest);
  await writeFile(resolve(context, ".openai/hosting.review.json"), manifest);
  await mkdir(resolve(context, "public"));
  for (const name of ["favicon.svg", "file.svg", "globe.svg", "window.svg", "sns-quest-hero.png"]) await cp(resolve(root, "public", name), resolve(context, "public", name));
  await symlink(resolve(root, "node_modules"), resolve(context, "node_modules"), process.platform === "win32" ? "junction" : "dir");
}
const child = spawn(process.execPath, ["scripts/run-vinext.mjs", ...args], { cwd: command === "build" ? context : root, stdio: "inherit", env: { ...process.env, SNS_MANUAL_PROFILE: "review" } });
child.on("exit", async code => {
  process.exitCode = code ?? 1;
  if (command === "build" && code === 0) {
    try {
      await safeRemove(output);
      await cp(resolve(context, "dist"), output, { recursive: true });
      await mkdir(resolve(output, ".openai"), { recursive: true });
      await cp(resolve(context, ".openai/hosting.review.json"), resolve(output, ".openai/hosting.json"));
      await cp(resolve(context, "drizzle"), resolve(output, ".openai/drizzle"), { recursive: true });
      await checkReviewArtifact(output);
      console.log("Review-only artifact: dist-review (no Site ID, no media, no deployment).");
    } catch (error) { console.error(error); process.exitCode = 1; }
  }
});
child.on("error", error => { console.error(error); process.exitCode = 1; });
