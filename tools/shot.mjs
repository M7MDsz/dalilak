// One-at-a-time headless screenshots (uses the installed Chrome or Edge; no browser download).
//
// Quick form:
//   node tools/shot.mjs --url /roadmap --out artifacts/roadmap.png [--seed mid-path] [--phone] [--full] [--wait 800] [--viewport 1440x900] [--reduced]
//   node tools/shot.mjs --url design/explore/a/index.html --out design/explore/a/shots/desktop.png --full
//
// Scripted form (flows and motion frames). Put the steps in a JSON file (Arabic text MUST live in the file, never on the command line):
//   node tools/shot.mjs --steps artifacts/steps/onboarding.json [--phone] [--video artifacts/video]
//   [
//     { "goto": "/?seed=fresh" },                 // path on the app, an absolute URL, or a local .html file
//     { "waitFor": "[data-testid=signin-name]" }, // CSS selector (or text=... / role=...)
//     { "fill": ["[data-testid=signin-name]", "سارة"] },
//     { "press": "Enter" },
//     { "wait": 400 },                            // ms
//     { "shot": "artifacts/onb-1.png" },          // add "full": true for the whole page, "selector": "..." for one element
//     { "click": "text=ابدأ" },
//     { "hover": ".card" }, { "type": ["textarea", "مرحبا", 30] }, { "scroll": 600 }, { "scrollTo": ".footer" },
//     { "setFiles": ["input[type=file]", "public/samples/cv.pdf"] },
//     { "eval": "localStorage.clear()" }, { "viewport": "390x844" }, { "reducedMotion": true }
//   ]
// Every run ends with a list of console errors and failed requests, so a broken page is visible without looking at the picture.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

import { withLock } from "./lock.mjs";

const root = path.dirname(import.meta.dirname);
const BASE = process.env.MASARI_BASE ?? "http://127.0.0.1:3040";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};

// Git Bash rewrites an argument that starts with "/" into a Windows path under the Git folder ("/dev/kit" arrives as
// "C:/Programs/Git/dev/kit"). Undo that, so routes can be written naturally.
const unmangle = (target) => {
  if (!/^[A-Za-z]:[\\/]/.test(target)) return target;
  const norm = target.split("\\").join("/");
  const roots = [];
  if (process.env.EXEPATH) {
    const exe = process.env.EXEPATH.split("\\").join("/");
    roots.push(exe.replace(/[/](bin|usr[/]bin|mingw64[/]bin)$/i, ""), exe);
  }
  roots.push("C:/Program Files/Git", "C:/Programs/Git");
  for (const r of roots) if (norm.toLowerCase().startsWith(r.toLowerCase())) return "/" + norm.slice(r.length).replace(/^[/]+/, "");
  return target;
};
const resolveTarget = (rawTarget, seed) => {
  const target = unmangle(rawTarget);
  let url;
  if (/^https?:\/\//.test(target) || target.startsWith("file:")) url = target;
  else if (/\.html?($|[?#])/.test(target) && !target.startsWith("/")) url = pathToFileURL(path.resolve(root, target)).href;
  else url = BASE + (target.startsWith("/") ? target : `/${target}`);
  if (seed) url += (url.includes("?") ? "&" : "?") + `seed=${encodeURIComponent(seed)}`;
  return url;
};

const parseViewport = (text) => {
  const [w, h] = String(text).split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
};

const ensureDir = (file) => fs.mkdirSync(path.dirname(path.resolve(root, file)), { recursive: true });

async function main() {
  const phone = flag("phone");
  const viewport = phone ? { width: 390, height: 844 } : parseViewport(opt("viewport", "1440x900"));
  const stepsFile = opt("steps");
  const videoDir = opt("video");
  let browser;
  for (const channel of ["chrome", "msedge"]) {
    try {
      browser = await chromium.launch({ channel, headless: true });
      break;
    } catch {
      /* try the next browser */
    }
  }
  if (!browser) throw new Error("Could not start Chrome or Edge headless.");
  const problems = [];
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: Number(opt("scale", phone ? "2" : "1")),
      isMobile: phone,
      hasTouch: phone,
      locale: "ar-SA",
      reducedMotion: flag("reduced") ? "reduce" : "no-preference",
      ...(videoDir ? { recordVideo: { dir: path.resolve(root, videoDir), size: viewport } } : {}),
    });
    const page = await context.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console.error: ${m.text().slice(0, 400)}`);
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 400)}`));
    page.on("requestfailed", (r) => {
      const why = r.failure()?.errorText ?? "";
      if (!why.includes("ERR_ABORTED")) problems.push(`request failed: ${r.url().slice(0, 160)} ${why}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url().slice(0, 160)}`);
    });

    const go = async (target, seed) => {
      const url = resolveTarget(target, seed);
      try {
        await page.goto(url, { waitUntil: "load", timeout: 45_000 });
      } catch (e) {
        if (String(e).includes("ERR_CONNECTION_REFUSED")) {
          console.log(`[shot] The app server is not running at ${BASE}. Do NOT start one yourself; carry on without screenshots and say so in your report.`);
          process.exitCode = 3;
          throw e;
        }
        throw e;
      }
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
    };

    if (stepsFile) {
      const steps = JSON.parse(fs.readFileSync(path.resolve(root, stepsFile), "utf8"));
      for (const [index, step] of steps.entries()) {
        try {
          if (step.goto !== undefined) await go(step.goto, step.seed);
          else if (step.waitFor !== undefined) await page.locator(step.waitFor).first().waitFor({ state: "visible", timeout: step.timeout ?? 15_000 });
          else if (step.click !== undefined) await page.locator(step.click).first().click({ timeout: step.timeout ?? 10_000 });
          else if (step.hover !== undefined) await page.locator(step.hover).first().hover({ timeout: 10_000 });
          else if (step.fill !== undefined) await page.locator(step.fill[0]).first().fill(step.fill[1], { timeout: 10_000 });
          else if (step.type !== undefined) await page.locator(step.type[0]).first().pressSequentially(step.type[1], { delay: step.type[2] ?? 25 });
          else if (step.press !== undefined) await page.keyboard.press(step.press);
          else if (step.wait !== undefined) await page.waitForTimeout(step.wait);
          else if (step.scroll !== undefined) await page.mouse.wheel(0, step.scroll);
          else if (step.scrollTo !== undefined) await page.locator(step.scrollTo).first().scrollIntoViewIfNeeded();
          else if (step.setFiles !== undefined) await page.locator(step.setFiles[0]).first().setInputFiles(path.resolve(root, step.setFiles[1]));
          else if (step.eval !== undefined) await page.evaluate(step.eval);
          else if (step.viewport !== undefined) await page.setViewportSize(parseViewport(step.viewport));
          else if (step.reducedMotion !== undefined) await page.emulateMedia({ reducedMotion: step.reducedMotion ? "reduce" : "no-preference" });
          else if (step.shot !== undefined) {
            ensureDir(step.shot);
            const file = path.resolve(root, step.shot);
            if (step.selector) await page.locator(step.selector).first().screenshot({ path: file });
            else await page.screenshot({ path: file, fullPage: step.full === true });
            console.log(`[shot] saved ${step.shot}`);
          } else problems.push(`step ${index}: unknown step ${JSON.stringify(step)}`);
        } catch (e) {
          problems.push(`step ${index} ${JSON.stringify(step).slice(0, 120)} FAILED: ${String(e).split("\n")[0].slice(0, 300)}`);
          if (process.exitCode === 3) break;
          if (step.optional !== true && !flag("keep-going")) {
            const fail = `artifacts/_failed-step-${index}.png`;
            ensureDir(fail);
            await page.screenshot({ path: path.resolve(root, fail) }).catch(() => {});
            console.log(`[shot] stopped at step ${index}; the page at that moment: ${fail}`);
            break;
          }
        }
      }
    } else {
      const target = opt("url");
      const out = opt("out");
      if (!target || !out) throw new Error("Need --url and --out (or --steps file.json).");
      await go(target, opt("seed"));
      await page.waitForTimeout(Number(opt("wait", "600")));
      ensureDir(out);
      await page.screenshot({ path: path.resolve(root, out), fullPage: flag("full") });
      console.log(`[shot] saved ${out}`);
    }
    await context.close();
  } finally {
    await browser.close();
  }
  console.log(problems.length === 0 ? "[shot] no console errors, no failed requests." : `[shot] ${problems.length} problem(s):\n- ${[...new Set(problems)].slice(0, 25).join("\n- ")}`);
}

await withLock("browser", main, { staleMs: 150_000 }).catch((e) => {
  if (process.exitCode !== 3) {
    console.error(`[shot] ${String(e).split("\n")[0]}`);
    process.exitCode = 1;
  }
});
