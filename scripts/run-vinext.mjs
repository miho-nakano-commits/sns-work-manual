import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const command = process.argv[2];
if (!["dev", "build", "start"].includes(command)) throw new Error("Expected dev, build or start");
const cli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
const child = spawn(process.execPath, [cli, command, ...process.argv.slice(3)], {
  stdio: "inherit", env: { ...process.env, WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || ".wrangler/wrangler.log" },
});
child.on("exit", code => { process.exitCode = code ?? 1; });
child.on("error", error => { console.error(error); process.exitCode = 1; });
