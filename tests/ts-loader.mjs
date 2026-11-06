import { readFile, access } from "node:fs/promises";
import ts from "typescript";
export async function resolve(specifier, context, nextResolve) {
  if (["cloudflare:workers", "next/headers", "next/navigation"].includes(specifier)) return { url: new URL("./runtime-mock.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const url = new URL(specifier, context.parentURL);
    for (const suffix of [".ts", ".tsx"]) {
      try { await access(new URL(url.href + suffix)); return { url: url.href + suffix, shortCircuit: true }; } catch { /* Try next extension. */ }
    }
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (/\.tsx?$/.test(url) && url.startsWith("file:")) {
    const source = ts.transpileModule(await readFile(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: url }).outputText;
    return { format: "module", source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
