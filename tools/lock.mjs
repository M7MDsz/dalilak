// A tiny cross-process lock (atomic mkdir) so that only ONE heavy job of a kind runs at a time on this laptop:
// one headless browser, one TypeScript check. Memory is the scarce thing here.
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(import.meta.dirname), ".locks");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs fn while holding the named lock. Waits (politely) for another holder; steals a lock older than staleMs
 * (its owner crashed or was killed).
 */
export async function withLock(name, fn, { staleMs = 180_000, waitMs = 900_000 } = {}) {
  fs.mkdirSync(root, { recursive: true });
  const dir = path.join(root, `${name}.lock`);
  const started = Date.now();
  let announced = false;
  for (;;) {
    try {
      fs.mkdirSync(dir);
      break;
    } catch {
      let age = 0;
      try {
        age = Date.now() - fs.statSync(dir).mtimeMs;
      } catch {
        continue; // released between mkdir and stat: try again at once
      }
      if (age > staleMs) {
        try {
          fs.rmdirSync(dir);
        } catch {
          /* someone else took it */
        }
        continue;
      }
      if (Date.now() - started > waitMs) throw new Error(`lock "${name}" busy for too long`);
      if (!announced) {
        process.stderr.write(`[lock] waiting for "${name}" (another job is using it)...\n`);
        announced = true;
      }
      await sleep(400 + Math.floor(Math.random() * 400));
    }
  }
  // Keep the lock fresh while a long job runs, so nobody steals it.
  const beat = setInterval(() => {
    try {
      const now = new Date();
      fs.utimesSync(dir, now, now);
    } catch {
      /* ignore */
    }
  }, 20_000);
  try {
    return await fn();
  } finally {
    clearInterval(beat);
    try {
      fs.rmdirSync(dir);
    } catch {
      /* ignore */
    }
  }
}
