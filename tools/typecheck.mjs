// Serialised TypeScript check: `npm run typecheck` or `npm run typecheck -- src/features/jobs src/lib/foo.ts`
// With path filters, only errors in those paths are printed in full; errors elsewhere are counted on one line
// (other builders may be mid-edit; their errors are theirs to fix).
import { spawn } from "node:child_process";
import path from "node:path";

import { withLock } from "./lock.mjs";

const root = path.dirname(import.meta.dirname);
const filters = process.argv.slice(2).map((f) => f.replaceAll("\\", "/").replace(/^\.\//, ""));

const run = () =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit", "--pretty", "false"], { cwd: root });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });

const { code, out } = await withLock("tsc", run, { staleMs: 240_000 });
const blocks = [];
for (const line of out.split(/\r?\n/)) {
  if (/^\S.*\(\d+,\d+\): error TS\d+/.test(line)) blocks.push(line);
  else if (blocks.length > 0 && line.trim() !== "") blocks[blocks.length - 1] += `\n${line}`;
  else if (line.trim() !== "") blocks.push(line);
}
if (filters.length === 0) {
  console.log(blocks.join("\n"));
  console.log(`\n[typecheck] ${blocks.length === 0 ? "clean" : `${blocks.length} error(s)`}`);
  process.exit(code ?? 1);
}
const mine = blocks.filter((b) => filters.some((f) => b.replaceAll("\\", "/").startsWith(f)));
const others = blocks.length - mine.length;
console.log(mine.join("\n"));
console.log(`\n[typecheck] ${mine.length} error(s) in your paths (${filters.join(", ")}); ${others} elsewhere (not yours).`);
process.exit(mine.length === 0 ? 0 : 1);
