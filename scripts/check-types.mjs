import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Generate Cloudflare's official runtime declarations locally, without a remote
// connection or any database operation. Generated files stay under ignored work/.
await mkdir("work", { recursive: true });
await writeFile("work/typecheck-wrangler.json", JSON.stringify({ name: "sns-manual-typecheck", main: "../worker/index.ts", compatibility_date: "2026-10-13", compatibility_flags: ["nodejs_compat"], d1_databases: [{ binding: "DB", database_name: "site-creator-d1", database_id: "00000000-0000-4000-8000-000000000000" }] }));
for (const args of [
  ["node_modules/wrangler/bin/wrangler.js", "types", "work/worker-runtime.d.ts", "--config", "work/typecheck-wrangler.json", "--env-interface", "CloudflareEnv"],
  ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/typecheck.log" } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
