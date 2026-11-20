// Writes option-1.html ("The Climb") next to this file. The page it writes is standalone: HTML + CSS + inline SVG, no scripts.
// Run from the project root:   node design/explore/darb/map/option-1.build.mjs
//
// Why a small generator: the trail is ONE smooth curve through the station points, and every marker, leader and label is
// placed from those same points, so nothing can float away from its station. Change a point here and everything follows.
// The same function draws the desktop sheet and the phone sheet; it takes 4 to 8 stations.
import fs from "node:fs";
import path from "node:path";

const dir = import.meta.dirname;
const darb = fs.readFileSync(path.join(dir, "..", "index.html"), "utf8");

// ---------- pieces taken verbatim from the Darb direction (logo, icons, Sara's avatar, the contour blob) ----------
const symbol = (id) => {
  const m = darb.match(new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`));
  if (!m) throw new Error(`symbol ${id} not found in the Darb page`);
  return m[0].replace(/\s*\n\s*/g, "");
};
const defLine = (id) => {
  const m = darb.match(new RegExp(`^\\s*<(?:g|path|ellipse) id="${id}".*$`, "m"));
  if (!m) throw new Error(`def ${id} not found in the Darb page`);
  return m[0].trim();
};
const icons = ["mark", "peak", "i-path", "i-tree", "i-cv", "i-jobs", "i-courses", "i-advisor", "i-leaders", "i-profile", "i-streak", "i-lock", "i-arrow", "i-clock", "i-check"];
const avatarParts = ["a-eyes", "a-smile", "a-shoulders", "a-hijab", "a-face", "a-hijab-folds"];

// ---------- geometry ----------
const r1 = (n) => Math.round(n * 10) / 10;
const f = (p) => `${r1(p[0])} ${r1(p[1])}`;
/** Smooth curve through the points, as one cubic per leg (so legs can be drawn in different styles). */
function legs(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    out.push([p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]);
  }
  return out;
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function split(s, t) {
  const ab = lerp(s[0], s[1], t), bc = lerp(s[1], s[2], t), cd = lerp(s[2], s[3], t);
  const abc = lerp(ab, bc, t), bcd = lerp(bc, cd, t), mid = lerp(abc, bcd, t);
  return [[s[0], ab, abc, mid], [mid, bcd, cd, s[3]]];
}
function tAtY(s, y) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const t = (lo + hi) / 2;
    if (split(s, t)[0][3][1] > y) lo = t; else hi = t; // the trail only ever goes up the page
  }
  return (lo + hi) / 2;
}
const d = (ss) => ss.map((s, i) => `${i ? "" : `M${f(s[0])}`}C${f(s[1])} ${f(s[2])} ${f(s[3])}`).join("");

// ---------- content ----------
const stations = [
  { n: 1, state: "done", name: "أساسيات Excel", xp: 100 },
  { n: 2, state: "done", name: "مبادئ الإحصاء", xp: 150 },
  { n: 3, state: "now", name: "SQL للمبتدئين", hours: "6 ساعات", xp: 200, to: 78 },
  { n: 4, state: "lock", name: "تحليل البيانات بـ Python", note: "تُفتح بعد SQL" },
  { n: 5, state: "lock", name: "Power BI ولوحات المعلومات", note: "مقفلة" },
  { n: 6, state: "lock", name: "مشروع تطبيقي: تحليل مبيعات", note: "مقفلة" },
];
const spot = (text) => `<span class="spot"><svg><use href="#peak"/></svg>${text}</span>`;
const face = `<svg viewBox="0 0 96 96"><use href="#av-1"/></svg>`;
const ringAvatar = (size, bg = "") =>
  `<span class="av s48" style="--s:${size}px${bg}"><span class="face">${face}</span><svg class="rg" viewBox="0 0 100 100"><circle class="t" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="81 19" transform="rotate(124.2 50 50)"/><circle class="p" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="39 100" transform="rotate(124.2 50 50)"/></svg><b class="lv">3</b></span>`;

/**
 * One climb sheet. All numbers are px in the sheet's own box.
 * start/summit: [x, y] · at: one [x, y] per station (bottom to top) · youY: where on the current leg the walker stands
 */
function climb(o) {
  const { W, H, start, at, summit, youY, R, Rnow, Rring, Rstart, Rsum, anchor, w, flag, peaks, rings, crosses, sm } = o;
  const iNow = stations.findIndex((s) => s.state === "now");
  const all = legs([start, ...at, summit]);
  const [walked, toNext] = split(all[iNow], tAtY(all[iNow], youY));
  const you = walked[3];
  const covered = [...all.slice(0, iNow), walked];
  const ahead = all.slice(iNow + 1);
  const [sx, sy] = summit;

  // terrain: nested copies of one blob around the summit; they drift down the page as they grow (the gentle side is the way up)
  const ringEls = rings
    .map((radius, i) => {
      const s = radius / 96;
      return `<use href="#blob"${i % 4 === 3 ? ' class="ix"' : ""} transform="translate(${r1(sx + 0.06 * radius)} ${r1(sy + 0.1 * radius)}) rotate(-8) scale(${(1.55 * s).toFixed(3)} ${s.toFixed(3)})"/>`;
    })
    .join("");
  const crossEls = crosses.map(([x, y]) => `M${x - 5} ${y}h10M${x} ${y - 5}v10`).join("");

  // markers
  const fs1 = sm ? 17 : 20;
  const fsNow = sm ? 21 : 25;
  const dash = (radius) => {
    const c = 2 * Math.PI * radius;
    return `3.2 ${r1(c / Math.round(c / 6.9) - 3.2)}`;
  };
  const marker = (s, [x, y]) => {
    if (s.state === "done") return `<circle class="m-done" cx="${x}" cy="${y}" r="${R}"/><text class="n-done" x="${x}" y="${r1(y + fs1 * 0.355)}" font-size="${fs1}">${s.n}</text>`;
    if (s.state === "now") return `<circle class="m-ring" cx="${x}" cy="${y}" r="${Rring}"/><circle class="m-now" cx="${x}" cy="${y}" r="${Rnow}"/><text class="n-now" x="${x}" y="${r1(y + fsNow * 0.355)}" font-size="${fsNow}">${s.n}</text>`;
    return `<circle class="halo" cx="${x}" cy="${y}" r="${R + 4}"/><circle class="m-lock" cx="${x}" cy="${y}" r="${R}" stroke-dasharray="${dash(R)}"/><text class="n-lock" x="${x}" y="${r1(y + fs1 * 0.355)}" font-size="${fs1}">${s.n}</text>`;
  };
  const edge = (s) => (s.state === "now" ? Rring : R);
  const leader = ([x, y], from, cls = "") => `<path class="ldr${cls}" d="M${r1(x - from - 3)} ${y}H${r1(x - anchor)}"/>`;

  const svg = `<svg class="t" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <!-- terrain: quiet texture only; the trail has a casing, so no contour ever touches it -->
          <g class="ctr">${ringEls}</g>
          <path class="svy" d="${crossEls}"/>
          <!-- after the summit: two short side trails to neighbouring peaks -->
          <g class="brn">${peaks.map((p) => `<path d="${p.d}"/>`).join("")}</g>
          ${peaks.map((p) => `<path class="pk" d="M${p.at[0]} ${p.at[1] - flag.pk}l${r1(flag.pk * 1.05)} ${r1(flag.pk * 1.8)}h${r1(-flag.pk * 2.1)}z"/>`).join("")}
          <!-- the trail: casing, then the way ahead (dotted), the next leg (vermilion dots), the covered part (solid ink) -->
          <path class="case" stroke-width="${w.casing}" d="${d(all)}"/>
          <path class="ahd" stroke-width="${w.dot}" stroke-dasharray=".1 ${w.gap}" d="${d(ahead)}"/>
          <path class="leg" stroke-width="${w.dot + 0.4}" stroke-dasharray=".1 ${w.gap}" d="${d([toNext])}"/>
          <path class="cov" stroke-width="${w.line}" d="${d(covered)}"/>
          <!-- leaders: the same short stroke, the same side, for every station -->
          ${leader(start, Rstart, " q")}${stations.map((s, i) => leader(at[i], edge(s), s.state === "lock" ? " q" : "")).join("")}${leader(summit, Rsum)}
          <!-- trailhead -->
          <circle class="m-start" cx="${start[0]}" cy="${start[1]}" r="${Rstart}"/><circle class="m-dot" cx="${start[0]}" cy="${start[1]}" r="${r1(Rstart * 0.32)}"/>
          <!-- stations -->
          ${stations.map((s, i) => marker(s, at[i])).join("\n          ")}
          <!-- you are here: the waypoint where the solid line ends -->
          <path class="stem" d="M${r1(you[0])} ${r1(you[1])}h${flag.stem}"/>
          <circle class="m-you" cx="${r1(you[0])}" cy="${r1(you[1])}" r="${flag.you}"/>
          <!-- summit: the end -->
          <circle class="m-sum" cx="${sx}" cy="${sy}" r="${Rsum}"/><circle class="m-dot" cx="${sx}" cy="${sy}" r="${r1(Rsum * 0.36)}"/>
          <path class="pole" d="M${sx} ${sy}V${sy - flag.pole}"/>
          <path class="pen" d="M${sx + 1.5} ${sy - flag.pole + 1}l${flag.w} ${r1(flag.h / 2)}l${-flag.w} ${r1(flag.h / 2)}z"/>
          <circle class="m-dot" cx="${sx}" cy="${sy - flag.pole - 1}" r="${sm ? 2.2 : 2.8}"/>
        </svg>`;

  // labels: every one hangs from the same side of its marker at the same distance
  const hang = (cls, [x, y], redge, inner) => `<a class="st ${cls}" style="left:${r1(x + redge)}px;top:${y}px"><i style="width:${r1(redge + anchor)}px"></i><span class="lb">${inner}</span></a>`;
  const label = (s, p) => {
    if (s.state === "done") return hang("done", p, R, `<b>${s.name}</b><small><svg class="ic ok"><use href="#i-check"/></svg>تمّت${spot(`+${s.xp} XP`)}</small>`);
    if (s.state === "now")
      return hang(
        "now",
        p,
        Rring,
        `<span class="e">محطتك التالية</span><b>${s.name}</b>${sm ? "" : `<small><span><svg class="ic"><use href="#i-clock"/></svg>${s.hours}</span>${spot(`+${s.xp} XP`)}<span>يرفع تطابقك إلى <b class="ltr">${s.to}%</b></span></small>`}`,
      );
    return hang("lock", p, R, `<b>${s.name}</b><small><svg class="ic" style="--wp:var(--ink4)"><use href="#i-lock"/></svg>${s.note}</small>`);
  };
  const html = [
    hang("start", start, Rstart, `<b>البداية</b>`),
    ...stations.map((s, i) => label(s, at[i])),
    hang("goal", summit, Rsum, `<b>جاهزة لوظيفة محلل بيانات</b><small>القمة · تطابق <b class="ltr">100%</b></small>`),
    ...peaks.map((p) => `<a class="st peak" style="left:${r1(p.at[0] + flag.pk * 1.05)}px;top:${p.at[1] + (sm ? 1 : 2)}px"><i style="width:${r1(flag.pk * 2.1 + (sm ? 6 : 8))}px"></i><span class="lb"><b>${p.name}</b><small>بعد القمة</small></span></a>`),
    `<div class="you" style="left:${r1(you[0] + flag.stem)}px;top:${r1(you[1])}px"><span class="tx"><b>أنت هنا</b><small>تطابقك <i>70%</i></small></span><span class="face">${face}</span></div>`,
  ].join("\n        ");
  return `${svg}\n        ${html}`;
}

const desktop = climb({
  W: 672, H: 852,
  start: [370, 806],
  at: [[372, 743], [384, 657], [406, 522], [416, 436], [408, 350], [392, 264]],
  summit: [384, 178],
  youY: 613,
  R: 23, Rnow: 27, Rring: 34, Rstart: 11, Rsum: 15, anchor: 54,
  w: { casing: 15, line: 5, dot: 5.2, gap: 12 },
  flag: { pole: 68, w: 42, h: 29, pk: 10, stem: 24, you: 7.5 },
  peaks: [
    { name: "عالِم بيانات", at: [270, 60], d: "M373 167C350 142 312 100 276 72" },
    { name: "محلل ذكاء أعمال", at: [530, 70], d: "M398 172C440 160 506 130 530 80" },
  ],
  rings: [20, 46, 78, 116, 160, 210, 266, 328, 396, 470, 550, 636, 728, 826],
  crosses: [[56, 250], [56, 430], [616, 250], [616, 430]],
});

const phone = climb({
  W: 366, H: 553, sm: true,
  start: [219, 529],
  at: [[220, 489], [226, 434], [238, 324], [242, 269], [238, 214], [230, 159]],
  summit: [226, 104],
  youY: 396,
  R: 20, Rnow: 23, Rring: 28.5, Rstart: 8.5, Rsum: 11, anchor: 40,
  w: { casing: 12, line: 4.4, dot: 4.4, gap: 9.8 },
  flag: { pole: 44, w: 27, h: 19, pk: 8, stem: 18, you: 6 },
  peaks: [
    { name: "عالِم بيانات", at: [146, 30], d: "M219 96C206 80 180 56 151 39" },
    { name: "محلل ذكاء أعمال", at: [326, 32], d: "M236 99C268 92 310 72 326 40" },
  ],
  rings: [13, 30, 51, 76, 104, 137, 173, 213, 257, 305, 357, 413, 473, 537],
  crosses: [[338, 170], [338, 290]],
});

const css = fs.readFileSync(path.join(dir, "option-1.css.txt"), "utf8");
const body = fs.readFileSync(path.join(dir, "option-1.body.txt"), "utf8");

const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    ${icons.map(symbol).join("\n    ")}
    ${avatarParts.map(defLine).join("\n    ")}
    ${symbol("av-1")}
    ${defLine("blob")}
  </defs>
</svg>`;

const page = body
  .replace("/*CSS*/", () => css.trim())
  .replace("<!--SPRITE-->", () => sprite)
  .replace("<!--CLIMB-DESKTOP-->", () => desktop)
  .replace("<!--CLIMB-PHONE-->", () => phone)
  .replaceAll("<!--AVATAR-50-->", () => ringAvatar(50))
  .replaceAll("<!--AVATAR-44-->", () => ringAvatar(44, ";--bg:var(--paper)"))
  .replaceAll("<!--FACE-->", () => face);
if (/<!--[A-Z0-9-]+-->|\/\*CSS\*\//.test(page)) throw new Error("a placeholder was left unfilled");
fs.writeFileSync(path.join(dir, "option-1.html"), page.replace(/\r\n/g, "\n"));
console.log(`option-1.html written (${page.length} chars)`);
