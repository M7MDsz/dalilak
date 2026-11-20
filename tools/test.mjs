// Serialised unit tests: `npm run test:one -- src/lib/engine` (any vitest filters). One vitest run at a time on this laptop.
import { spawn } from "node:child_process";
import path from "node:path";

import { withLock } from "./lock.mjs";

const root = path.dirname(import.meta.dirname);
const filters = process.argv.slice(2);

const run = () =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "node_modules", "vitest", "vitest.mjs"), "run", "--reporter=dot", ...filters], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });

const code = await withLock("vitest", run, { staleMs: 300_000 });
process.exit(code);
