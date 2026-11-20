// Vitest 5.1 for the pure TypeScript of src/lib (STACK-NOTES 8). Run by the lead: `npm test` (vitest run, one pass).
// Tests live next to their module as `*.test.ts` under src/; they import pure modules only (no "use client" files,
// no next/*, no zustand store, no window / localStorage).
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    maxWorkers: 1,
    isolate: false,
  },
});
