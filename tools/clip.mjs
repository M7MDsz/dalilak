// Records a short clip of a motion (MP4, plus an optional contact sheet of frames you can READ as one PNG).
// One browser at a time (same lock as tools/shot.mjs).
//
// 1) STEP mode (default): for a page whose motion is CSS animations that start on load (static design pages).
//    Every frame is rendered exactly: animations are paused and moved to t = frame / fps, so the clip is perfectly smooth
//    whatever the laptop is doing. Only CSS @keyframes / Web Animations are driven (not SMIL <animate>, not JS timers).
//      node tools/clip.mjs --url design/explore/darb/map/option-1.html --selector "#home-frame" --seconds 4 \
//           --out design/explore/darb/map/option-1-open.mp4 --sheet design/explore/darb/map/option-1-open-sheet.png
//
// 2) REALTIME mode: for the running app (JS-driven motion). Records the real screen while a steps file plays.
//    Steps are the same as tools/shot.mjs, plus { "mark": "start" } and { "mark": "end" } to say which part to keep.
//      node tools/clip.mjs --mode realtime --steps artifacts/steps/open-map.json --out artifacts/clips/open-map.mp4 --sheet artifacts/clips/open-map-sheet.png
//
//    Step mode can also record an INTERACTION: --settle 4000 lets the load animations finish, then --trigger "<js>" runs
//    (for example "document.querySelector('[data-station=\"3\"]').click()") and only the animations it starts are
//    recorded frame-exact. This works for CSS transitions, CSS @keyframes and element.animate(); motion driven by
//    requestAnimationFrame or a canvas/WebGL loop cannot be stepped: record that with --mode realtime instead.
//      node tools/clip.mjs --url design/explore/darb/map/final-home.html --selector "#home-frame" --settle 4000 \
//           --trigger "document.querySelector('[data-station=\"3\"]').click()" --seconds 2 --out ...station.mp4
//
// Options: --viewport 1600x1000 | --phone | --fps 30 | --width 960 (output width) | --hold 0.8 (seconds the last frame is held, step mode)
//          --sheet <png> [--sheet-frames 8] | --gif <file.gif> (also write a GIF) | --seed <name> | --reduced
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ffmpegPath from "ffmpeg-static";
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
const abs = (p) => path.resolve(root, p);
const mkdirFor = (file) => fs.mkdirSync(path.dirname(abs(file)), { recursive: true });

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
  else if (/\.html?($|[?#])/.test(target) && !target.startsWith("/")) url = pathToFileURL(abs(target)).href;
  else url = BASE + (target.startsWith("/") ? target : `/${target}`);
  if (seed) url += (url.includes("?") ? "&" : "?") + `seed=${encodeURIComponent(seed)}`;
  return url;
};
const parseViewport = (text) => {
  const [w, h] = String(text).split("x").map(Number);
  return { width: w || 1600, height: h || 1000 };
};
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

const ffmpeg = (argv) =>
  new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", ...argv]);
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${err.slice(0, 600)}`))));
  });

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* next */
    }
  }
  throw new Error("Could not start Chrome or Edge headless.");
}

async function extras(out, seconds) {
  const sheet = opt("sheet");
  if (sheet) {
    const n = Number(opt("sheet-frames", "8"));
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    const rows = n <= 4 ? 1 : 2;
    mkdirFor(sheet);
    await ffmpeg(["-i", abs(out), "-vf", `fps=${(n / Math.max(seconds, 0.1)).toFixed(4)},scale=560:-2,tile=${cols}x${rows}:padding=6:margin=6:color=white`, "-frames:v", "1", abs(sheet)]);
    console.log(`[clip] contact sheet (${n} frames, left to right, top to bottom): ${sheet}`);
  }
  const gif = opt("gif");
  if (gif) {
    mkdirFor(gif);
    await ffmpeg(["-i", abs(out), "-vf", "fps=15,scale=640:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4", abs(gif)]);
    console.log(`[clip] gif: ${gif} (${(fs.statSync(abs(gif)).size / 1e6).toFixed(1)} MB)`);
  }
}

async function stepMode(browser) {
  const target = opt("url");
  const out = opt("out");
  if (!target || !out) throw new Error("Need --url and --out.");
  const fps = Number(opt("fps", "30"));
  const seconds = Number(opt("seconds", "4"));
  const hold = Number(opt("hold", "0.8"));
  const phone = flag("phone");
  const viewport = phone ? { width: 390, height: 844 } : parseViewport(opt("viewport", "1600x1000"));
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "ar-SA", reducedMotion: flag("reduced") ? "reduce" : "no-preference" });
  const page = await context.newPage();
  await page.goto(resolveTarget(target, opt("seed")), { waitUntil: "load", timeout: 45_000 });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // --settle <ms>: let the page's own load animations play out first (real time).
  const settle = Number(opt("settle", "0"));
  if (settle > 0) await page.waitForTimeout(settle);
  // --trigger <js>: run an interaction (for example a click on a station) and record ONLY the animations it starts
  // (CSS transitions, CSS animations, element.animate). Animations that existed before are frozen where they are.
  const trigger = opt("trigger");
  const count = await page.evaluate(async (js) => {
    if (js) {
      const before = new Set(document.getAnimations());
      for (const a of before) a.pause();
      // eslint-disable-next-line no-new-func
      await new Function(`return (async () => { ${js} })()`)();
      document.body.getBoundingClientRect();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.__anims = document.getAnimations().filter((a) => !before.has(a));
    } else {
      window.__anims = document.getAnimations();
    }
    for (const a of window.__anims) a.pause();
    return window.__anims.length;
  }, trigger);
  if (count === 0) console.log("[clip] WARNING: no CSS animations found on the page; the clip will be a still.");
  const selector = opt("selector");
  const shotTarget = selector ? page.locator(selector).first() : page;
  if (selector) await shotTarget.scrollIntoViewIfNeeded();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "masari-clip-"));
  const frames = Math.round(seconds * fps);
  for (let i = 0; i <= frames; i++) {
    await page.evaluate((t) => {
      for (const a of window.__anims) {
        try {
          a.currentTime = t;
        } catch {
          /* ignore */
        }
      }
    }, (i * 1000) / fps);
    await shotTarget.screenshot({ path: path.join(dir, `f-${String(i).padStart(4, "0")}.png`), animations: "allow" });
  }
  await context.close();
  const width = even(Number(opt("width", "960")));
  mkdirFor(out);
  await ffmpeg(["-framerate", String(fps), "-i", path.join(dir, "f-%04d.png"), "-vf", `scale=${width}:-2:flags=lanczos,tpad=stop_mode=clone:stop_duration=${hold}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", abs(out)]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`[clip] saved ${out} (${count} animations, ${seconds}s + ${hold}s hold, ${(fs.statSync(abs(out)).size / 1e6).toFixed(2)} MB)`);
  await extras(out, seconds + hold);
}

async function realtimeMode(browser) {
  const stepsFile = opt("steps");
  const out = opt("out");
  if (!stepsFile || !out) throw new Error("Realtime mode needs --steps and --out.");
  const phone = flag("phone");
  const viewport = phone ? { width: 390, height: 844 } : parseViewport(opt("viewport", "1440x900"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "masari-clip-"));
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, locale: "ar-SA", reducedMotion: flag("reduced") ? "reduce" : "no-preference", recordVideo: { dir, size: viewport } });
  const page = await context.newPage();
  const t0 = Date.now();
  const marks = {};
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 300)}`));
  const steps = JSON.parse(fs.readFileSync(abs(stepsFile), "utf8"));
  for (const [index, step] of steps.entries()) {
    try {
      if (step.goto !== undefined) {
        await page.goto(resolveTarget(step.goto, step.seed), { waitUntil: "load", timeout: 45_000 });
        await page.evaluate(() => document.fonts?.ready).catch(() => {});
      } else if (step.mark !== undefined) marks[step.mark] = (Date.now() - t0) / 1000;
      else if (step.waitFor !== undefined) await page.locator(step.waitFor).first().waitFor({ state: "visible", timeout: step.timeout ?? 15_000 });
      else if (step.click !== undefined) await page.locator(step.click).first().click({ timeout: step.timeout ?? 10_000 });
      else if (step.hover !== undefined) await page.locator(step.hover).first().hover({ timeout: 10_000 });
      else if (step.fill !== undefined) await page.locator(step.fill[0]).first().fill(step.fill[1], { timeout: 10_000 });
      else if (step.type !== undefined) await page.locator(step.type[0]).first().pressSequentially(step.type[1], { delay: step.type[2] ?? 25 });
      else if (step.press !== undefined) await page.keyboard.press(step.press);
      else if (step.wait !== undefined) await page.waitForTimeout(step.wait);
      else if (step.scroll !== undefined) await page.mouse.wheel(0, step.scroll);
      else if (step.scrollTo !== undefined) await page.locator(step.scrollTo).first().scrollIntoViewIfNeeded();
      else if (step.setFiles !== undefined) await page.locator(step.setFiles[0]).first().setInputFiles(abs(step.setFiles[1]));
      else if (step.eval !== undefined) await page.evaluate(step.eval);
      else problems.push(`step ${index}: unknown step ${JSON.stringify(step)}`);
    } catch (e) {
      problems.push(`step ${index} ${JSON.stringify(step).slice(0, 120)} FAILED: ${String(e).split("\n")[0].slice(0, 300)}`);
      if (String(e).includes("ERR_CONNECTION_REFUSED")) {
        console.log(`[clip] The app server is not running at ${BASE}. Do NOT start one yourself; say so in your report.`);
        break;
      }
    }
  }
  const total = (Date.now() - t0) / 1000;
  const video = page.video();
  await context.close();
  const webm = await video.path();
  const start = Math.max(0, (marks.start ?? 0) - 0.05);
  const end = marks.end ?? total;
  const width = even(Number(opt("width", phone ? "390" : "960")));
  mkdirFor(out);
  await ffmpeg(["-ss", start.toFixed(3), "-i", webm, "-t", Math.max(0.5, end - start).toFixed(3), "-vf", `scale=${width}:-2:flags=lanczos`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", abs(out)]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`[clip] saved ${out} (${(end - start).toFixed(1)}s, ${(fs.statSync(abs(out)).size / 1e6).toFixed(2)} MB)`);
  await extras(out, end - start);
  if (problems.length > 0) console.log(`[clip] ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
}

await withLock(
  "browser",
  async () => {
    const browser = await launch();
    try {
      if (opt("mode", "step") === "realtime") await realtimeMode(browser);
      else await stepMode(browser);
    } finally {
      await browser.close();
    }
  },
  { staleMs: 240_000 },
).catch((e) => {
  console.error(`[clip] ${String(e).split("\n")[0]}`);
  process.exitCode = 1;
});
