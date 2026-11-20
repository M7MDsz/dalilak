// Writes final-home.html (and, with --stations 4, final-home-4.html) next to this file.
// Run from the project root:   node design/explore/darb/map/final-home.build.mjs [--stations 4]
//
// Why a generator: the trail is ONE curve, and every coin, label, shadow, terrace edge and opening delay is computed
// from that same curve, for the desktop sheet and the phone sheet, for 4 to 8 stations. The page it writes is
// standalone: HTML + CSS + inline SVG + one small script for the station flight.
import fs from "node:fs";
import path from "node:path";

const dir = import.meta.dirname;
const kit = fs.readFileSync(path.join(dir, "..", "colors", "option-1.html"), "utf8");
const argN = process.argv.indexOf("--stations");
const COUNT = argN > 0 ? Number(process.argv[argN + 1]) : 8;

// ---------- pieces taken from the navy Darb kit (logo mark, icons, avatar parts) ----------
const symbol = (id) => {
  const m = kit.match(new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`));
  if (!m) throw new Error(`symbol ${id} not found`);
  return m[0].replace(/\s*\n\s*/g, "");
};
const defLine = (id) => {
  const m = kit.match(new RegExp(`^\\s*<(?:g|path|ellipse) id="${id}".*$`, "m"));
  if (!m) throw new Error(`def ${id} not found`);
  return m[0].trim();
};
const icons = ["mark", "peak", "i-tree", "i-cv", "i-jobs", "i-courses", "i-advisor", "i-leaders", "i-profile", "i-streak", "i-lock", "i-arrow", "i-clock", "i-check", "i-apply"];
const avatarParts = ["a-eyes", "a-smile", "a-shoulders", "a-neck", "a-head", "a-ghutra", "a-ghutra-cap", "a-agal", "a-ghutra-folds", "a-beard", "a-tache", "a-collar", "a-hair-m"];
const avatars = ["av-5", "av-6", "av-7"];

// ---------- content: the demo right after the sample CV is analysed (spec 3.4, 6.2, 7.2, 9.4, 9.5, 10.4 step 7) ----------
const EV_EXCEL = "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.";
const EV_SQL = "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.";
const ALL = [
  { state: "done", skill: "Excel", star: 1, slots: 3, course: "Excel من الصفر", sub: "الجداول والمعادلات", h: 8, gain: 10, ev: EV_EXCEL },
  { state: "done", skill: "SQL", star: 1, slots: 3, course: "أساسيات SQL", sub: "الاستعلام عن البيانات", h: 8, gain: 10, ev: EV_SQL },
  { state: "done", skill: "الإحصاء", star: 1, slots: 2, course: "مبادئ الإحصاء الوصفي", sub: "", h: 8, gain: 10, ev: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python." },
  { state: "done", skill: "التواصل الفعّال", star: 1, slots: 2, course: "التواصل الفعّال في بيئة العمل", sub: "", h: 6, gain: 20, ev: "التواصل، العمل الجماعي، العرض والتقديم." },
  { state: "done", skill: "Excel", star: 2, slots: 3, course: "Excel للتحليل", sub: "الجداول المحورية والدوال", h: 10, gain: 10, ev: EV_EXCEL },
  { state: "done", skill: "SQL", star: 2, slots: 3, course: "SQL للتحليل", sub: "الربط والتجميع", h: 12, gain: 10, ev: EV_SQL },
  { state: "now", skill: "Power BI", star: 1, slots: 3, course: "أساسيات Power BI", sub: "من البيانات إلى لوحة المعلومات", h: 10, gain: 20 },
  { state: "next", skill: "الإحصاء", star: 2, slots: 2, course: "الإحصاء التطبيقي للمحللين", sub: "", h: 12, gain: 10, why: "متاحة لك من الآن: تحمل النجمة 1 في الإحصاء" },
];
// the 4-station proof (layout only): two done, the current one, one locked
const FOUR = [
  { ...ALL[0], gain: 20 },
  { ...ALL[1], gain: 20 },
  { ...ALL[6], gain: 30 },
  { state: "lock", skill: "تصوير البيانات", star: 1, slots: 2, course: "أساسيات تصوير البيانات", sub: "", h: 8, gain: 30, why: "تتطلب النجمة 1 في Power BI" },
];
const STATIONS = (COUNT === 4 ? FOUR : ALL).map((s, i) => ({ ...s, n: i + 1, les: { 6: 3, 8: 4, 10: 5, 12: 5, 14: 6, 16: 6 }[s.h], xp: s.h * 20 }));
const TOTAL = STATIONS.length;
const DONE = STATIONS.filter((s) => s.state === "done").length;
const NOW = STATIONS.find((s) => s.state === "now");
let acc = 0;
for (const s of STATIONS) {
  s.before = acc;
  acc += s.gain;
  s.after = acc;
}
const MATCH = NOW.before; // 70
const hoursLeft = STATIONS.filter((s) => s.state !== "done").reduce((a, s) => a + s.h, 0); // 22
const hrs = (h) => `${h} ${h >= 3 && h <= 10 ? "ساعات" : "ساعة"}`;
const lessons = (n) => `${n} ${n >= 3 && n <= 10 ? "دروس" : "درساً"}`;
const stateWord = { done: "مكتملة", now: "الآن", next: "لاحقاً", lock: "مقفلة" };

// ---------- small markup helpers ----------
const ic = (id, cls = "") => `<svg class="ic ${cls}"><use href="#${id}"/></svg>`;
const ltr = (t) => `<span class="ltr">${t}</span>`;
const spot = (xp, cls = "") => `<span class="spot ${cls}"><svg viewBox="0 0 13 12"><use href="#peak"/></svg>+${xp} XP</span>`;
const starRow = (filled, outline, cls = "") => `<span class="stars ${cls}">${'<svg class="on"><use href="#i-star"/></svg>'.repeat(filled)}${'<svg><use href="#i-star"/></svg>'.repeat(outline)}</span>`;
/** stars for a stage: the stars already held in that skill are solid, the one this stage earns is solid only when done */
const stageStars = (s, cls) => (s.state === "done" ? starRow(s.star, 0, cls) : starRow(s.star - 1, 1, cls));

// ---------- geometry ----------
const r1 = (n) => Math.round(n * 10) / 10;
function bez(x1, y1, x2, y2) {
  const c = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  return {
    /** time (0..1) at which the eased output reaches `out` */
    timeAt(out) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 40; i++) {
        const m = (lo + hi) / 2;
        if (c(m, y1, y2) < out) lo = m; else hi = m;
      }
      return c((lo + hi) / 2, x1, x2);
    },
  };
}
const FILL_EASE = [0.4, 0, 0.3, 1];

/** the contour ring shape (the Darb blob), flattened once */
const BLOB = [[100, 0], [100, 45, 70, 85, 20, 95], [-30, 105, -80, 80, -98, 30], [-112, -10, -90, -60, -50, -85], [-10, -108, 40, -100, 70, -75], [92, -55, 100, -30, 100, 0]];
const RING = { ox: 0.1, oy: 0.17, a: 1.5, b: 1, rot: (-8 * Math.PI) / 180 };
function ringPoint(u, v, k, S) {
  // no two contours are the same: each ring leans and widens a little differently, like real ground
  const wob = Math.sin(k * 1.7 + 0.6), wob2 = Math.sin(k * 2.9 + 2);
  const x = (RING.a + 0.13 * wob) * u * k, y = RING.b * v * k;
  const rot = RING.rot + 0.11 * wob2;
  const c = Math.cos(rot), s = Math.sin(rot);
  return [S[0] + RING.ox * 100 * k + x * c - y * s, S[1] + RING.oy * 100 * k + x * s + y * c];
}
// where the unit ring (k = 1, summit at 0,0) crosses the line straight below the summit
const RING_D1 = (() => {
  let best = 0;
  let p = BLOB[0];
  for (const seg of BLOB.slice(1)) {
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, u = 1 - t;
      const bx = u * u * u * p[0] + 3 * u * u * t * seg[0] + 3 * u * t * t * seg[2] + t * t * t * seg[4];
      const by = u * u * u * p[1] + 3 * u * u * t * seg[1] + 3 * u * t * t * seg[3] + t * t * t * seg[5];
      const q = ringPoint(bx, by, 1, [0, 0]);
      if (Math.abs(q[0]) < 2.5 && q[1] > best) best = q[1];
    }
    p = [seg[4], seg[5]];
  }
  return best;
})();
function ringPath(d, S) {
  const k = d / RING_D1;
  const P = (u, v) => ringPoint(u, v, k, S).map(r1).join(" ");
  return `M${P(...BLOB[0])}` + BLOB.slice(1).map((s) => `C${P(s[0], s[1])} ${P(s[2], s[3])} ${P(s[4], s[5])}`).join("") + "Z";
}

/**
 * One map sheet. Everything is placed from the trail: x = sway(y), a straight climb with a gentle natural sway.
 * cfg: { id, W, H, cx, yTop, yBottom, amp, rDone, rNow, rNext, phone }
 */
function sheet(cfg) {
  const { W, H, cx, amp, phone } = cfg;
  const yS = cfg.yBottom, yT = cfg.yTop, span = yS - yT;
  const sway = (y) => {
    const t = (yS - y) / span;
    return cx + amp * (0.82 * Math.sin(2 * Math.PI * (t * 1.12 + 0.07)) + 0.3 * Math.sin(2 * Math.PI * (t * 2.5 + 0.33)));
  };
  // vertical rhythm: the past is compact, the present has room
  const w = cfg.weights;
  const gaps = [];
  STATIONS.forEach((s, i) => {
    const prev = STATIONS[i - 1];
    if (s.state === "now") gaps.push(w.toNow);
    else if (!prev) gaps.push(w.first);
    else if (prev.state === "now") gaps.push(w.afterNow);
    else if (s.state === "done") gaps.push(w.done);
    else gaps.push(w.ahead);
  });
  gaps.push(w.toSummit);
  const unit = span / gaps.reduce((a, b) => a + b, 0);
  let y = yS;
  const pts = STATIONS.map((s, i) => {
    y -= gaps[i] * unit;
    return { ...s, y: r1(y), x: r1(sway(y)), r: s.state === "now" ? cfg.rNow : s.state === "done" ? cfg.rDone : cfg.rNext };
  });
  const now = pts.find((p) => p.state === "now");
  const prevY = now.n > 1 ? pts[now.n - 2].y : yS;
  const wayY = r1(prevY - (prevY - now.y) * w.way);
  const start = { x: r1(sway(yS)), y: yS };
  const summit = { x: r1(sway(yT)), y: yT };
  const way = { x: r1(sway(wayY)), y: wayY };

  // the trail as a fine polyline, bottom to top
  const poly = (ya, yb) => {
    const out = [];
    const n = Math.max(2, Math.ceil((ya - yb) / 3));
    for (let i = 0; i <= n; i++) {
      const yy = ya - ((ya - yb) * i) / n;
      out.push([sway(yy), yy]);
    }
    return out;
  };
  const dOf = (p) => p.map((q, i) => `${i ? "L" : "M"}${r1(q[0])} ${r1(q[1])}`).join("");
  const lenOf = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  const climbed = poly(yS, wayY), leg = poly(wayY, now.y), ahead = poly(now.y, yT);
  const fracClimbed = (yy) => lenOf(poly(yS, yy)) / lenOf(climbed);
  const fracAhead = (yy) => lenOf(poly(now.y, yy)) / lenOf(ahead);

  // ---------- the opening, all times in seconds (ONE place) ----------
  const O = { cam: 1.25, fill0: 0.4, fillD: 1.3, you: 1.72, count: 1.76, countD: 0.85, leg0: 2.0, legD: 0.28, now: 2.14, nowLb: 2.3, ahead0: 2.4, aheadD: 0.55, flag: 2.92, sumLb: 3.02, br: 3.15, rest: 3.5 };
  const ease = bez(...FILL_EASE);
  const tClimb = (yy) => O.fill0 + O.fillD * ease.timeAt(Math.min(1, fracClimbed(yy)));
  const tAhead = (yy) => O.ahead0 + O.aheadD * fracAhead(yy);
  for (const p of pts) p.t = r1(p.state === "done" ? tClimb(p.y) - 0.06 : p.state === "now" ? O.now : tAhead(p.y) - 0.04);

  // ---------- terrain: a hill of flat terraces; altitude = match. Each terrace edge sits where the trail reaches that match ----------
  const S = [summit.x, summit.y];
  const mid = (a, b) => (a + b) / 2;
  const levels = []; // { pct, y } where the trail crosses each match level
  pts.forEach((p, i) => {
    const nextY = pts[i + 1] ? pts[i + 1].y : yT;
    const yCross = p.state === "done" && pts[i + 1]?.state === "now" ? wayY : p.state === "now" ? mid(p.y, nextY) - (phone ? 0 : 2) : mid(p.y, nextY);
    levels.push({ pct: p.after, y: yCross });
  });
  const tint = ["#E2E9F3", "#E9EFF7", "#F0F4FA", "#F6F9FC", "#FBFCFE", "#FFFFFF"];
  const bandPcts = COUNT === 4 ? [0, 20, 40, 70, 100] : [0, 30, 50, 70, 90, 100];
  const rings = [];
  rings.push({ d: yS + 14 - yT, band: 0 });
  for (const l of levels) {
    const bi = bandPcts.indexOf(l.pct);
    rings.push({ d: l.y - yT, band: bi > 0 ? bi : -1, pct: l.pct, y: l.y });
  }
  // texture: one hairline between the wide upper terraces, and the land falling away beyond the trailhead and behind the summit
  const sorted = rings.map((r) => r.d).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > 70) rings.push({ d: mid(sorted[i], sorted[i - 1]), band: -1 });
  rings.push({ d: sorted[0] * 0.45, band: -1 });
  for (const extra of [70, 150, 250, 370, 520, 700, 920, 1200, 1550]) rings.push({ d: yS + 14 - yT + extra * (phone ? 0.7 : 1), band: -1 });
  rings.sort((a, b) => b.d - a.d);
  const CL = phone ? 3 : 3.5; // the terrace edge (a flat 3.5 px "cliff" on the side that faces the camera)
  const terrain = rings
    .map((r) => {
      const d = ringPath(r.d, S);
      if (r.band >= 0) return `<path class="cliff" d="${d}" transform="translate(0 ${CL})"/><path class="band" d="${d}" fill="${tint[Math.min(r.band, tint.length - 1)]}"/>`;
      return `<path class="hair" d="${d}"/>`;
    })
    .join("");
  // altitude marks: where the trail steps onto a terrace (the 70 edge carries «أنت هنا», the top one carries the summit)
  const marks = rings
    .filter((r) => r.band > 0 && r.pct !== MATCH && r.pct !== 100)
    .map((r) => {
      const x = sway(r.y) + (phone ? 13 : 17);
      return `<g class="alt" transform="translate(${r1(x)} ${r1(r.y + CL / 2)})"><rect x="0" y="-10" width="${phone ? 34 : 38}" height="20" rx="6"/><text x="${phone ? 17 : 19}" y="4.5">${r.pct}%</text></g>`;
    })
    .join("");
  const BL = cfg.bleed[0], BT = cfg.bleed[1], BB = cfg.bleed[2];
  const crosses = [[0.09, 0.3], [0.09, 0.62], [0.92, 0.3], [0.92, 0.5]].map(([fx, fy]) => `M${r1(W * fx - 5)} ${r1(H * fy)}h10M${r1(W * fx)} ${r1(H * fy - 5)}v10`).join("");

  // ---------- branches (after the summit, clearly secondary) ----------
  const peaks = cfg.peaks.map((p, i) => ({ ...p, ...[{ title: "أخصائي تقارير وبيانات", now: 50, after: 80 }, { title: "محلل ذكاء الأعمال", now: 43, after: 60 }][i] }));
  const brPaths = peaks.map((p) => `<path d="M${summit.x} ${summit.y}Q${r1(mid(summit.x, p.x))} ${r1(summit.y - (summit.y - p.y) * 0.25 - 14)} ${p.x} ${p.y + 6}"/>`).join("");

  const id = cfg.id;
  const sw = cfg.road; // road width
  const dot = phone ? 9.6 : 11;
  const trail = `
      <svg class="trail" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs>
          <mask id="${id}-mleg" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><path d="${dOf(leg)}" pathLength="1" class="draw" style="--d:${O.leg0}s;--t:${O.legD}s" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask>
          <mask id="${id}-mahd" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><path d="${dOf(ahead)}" pathLength="1" class="draw" style="--d:${O.ahead0}s;--t:${O.aheadD}s" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask>
        </defs>
        <g class="brn fade" style="--d:${O.br}s">${brPaths}</g>
        <!-- ground shadows: every coin stands on the sheet -->
        <g class="gshadow">${pts.map((p) => `<ellipse class="fade" style="--d:${p.t}s" cx="${p.x}" cy="${r1(p.y + p.r + 1)}" rx="${r1(p.r * 0.74)}" ry="${phone ? 4 : 5}"/>`).join("")}<ellipse class="fade" style="--d:${O.flag}s" cx="${summit.x}" cy="${summit.y + cfg.rSum + 1}" rx="${r1(cfg.rSum * 0.74)}" ry="4"/></g>
        <!-- the road: an edged white bed from the trailhead to the summit, drawn in the three legs of the story -->
        <g class="bed" stroke-width="${sw}"><path d="${dOf(climbed)}" pathLength="1" class="draw" style="--d:${O.fill0}s;--t:${O.fillD}s;--e:cubic-bezier(${FILL_EASE})"/><path d="${dOf(leg)}" pathLength="1" class="draw" style="--d:${O.leg0}s;--t:${O.legD}s"/><path d="${dOf(ahead)}" pathLength="1" class="draw" style="--d:${O.ahead0}s;--t:${O.aheadD}s"/></g>
        <g class="bed in" stroke-width="${sw - 3}"><path d="${dOf(climbed)}" pathLength="1" class="draw" style="--d:${O.fill0}s;--t:${O.fillD}s;--e:cubic-bezier(${FILL_EASE})"/><path d="${dOf(leg)}" pathLength="1" class="draw" style="--d:${O.leg0}s;--t:${O.legD}s"/><path d="${dOf(ahead)}" pathLength="1" class="draw" style="--d:${O.ahead0}s;--t:${O.aheadD}s"/></g>
        <!-- the way ahead: dots that drift slowly toward the summit (the little living move) -->
        <g mask="url(#${id}-mahd)"><path class="ahd dots" d="${dOf(ahead)}" stroke-width="${phone ? 3.4 : 4}" stroke-dasharray=".1 ${dot}" style="--p:${-(dot + 0.1)}"/></g>
        <g mask="url(#${id}-mleg)"><path class="leg dots" d="${dOf(leg)}" stroke-width="${phone ? 4.2 : 5}" stroke-dasharray=".1 ${dot}" style="--p:${-(dot + 0.1)}"/></g>
        <!-- the climbed part: solid ink -->
        <path class="cov draw" d="${dOf(climbed)}" pathLength="1" stroke-width="${sw - 7}" style="--d:${O.fill0}s;--t:${O.fillD}s;--e:cubic-bezier(${FILL_EASE})"/>
        <!-- the focus ring and the lifted coin's shadow (placed by the script) -->
        <ellipse class="fshadow" rx="20" ry="6"/>
        <circle class="fring" r="30" pathLength="1"/>
      </svg>`;

  // ---------- billboards: everything that stands on the sheet (coins, labels, the walker, the flag, the peaks) ----------
  const stationHtml = pts
    .map((p) => {
      const cls = { done: "s-done", now: "s-now", next: "s-next", lock: "s-lock" }[p.state];
      const title = `<b>${p.skill}${stageStars(p)}${p.state === "done" ? `<em>${ic("i-check", "ok")}من سيرتك</em>` : ""}</b>`;
      let small;
      if (p.state === "done") small = "";
      else if (p.state === "next") small = phone ? `<small>لاحقاً<i class="sep"></i>${hrs(p.h)}</small>` : `<small>لاحقاً<i class="sep"></i>${hrs(p.h)}${spot(p.xp)}</small>`;
      else if (p.state === "lock") small = `<small>${ic("i-lock", "mut")}مقفلة<i class="sep"></i>${phone ? "بعد Power BI" : p.why}</small>`;
      let lb;
      if (p.state === "now") {
        lb = `<span class="lb card-lb"><span class="e">مرحلتك التالية</span>${title}${phone ? "" : `<small><span>${ic("i-clock")}${hrs(p.h)}</span>${spot(p.xp)}<span>ترفع مطابقتك إلى <b>${ltr(p.after + "%")}</b></span></small>`}</span>`;
      } else lb = `<span class="lb">${title}${small}</span>`;
      const badge = p.state === "done" ? `<i class="ck">${ic("i-check")}</i>` : p.state === "lock" ? `<i class="lk">${ic("i-lock")}</i>` : "";
      return `<a class="bb st ${cls}" data-station="${p.n}" data-x="${p.x}" data-y="${p.y}" data-r="${p.r}" style="left:${p.x}px;top:${p.y}px;--r:${p.r}px;--d:${p.t}s" role="button" tabindex="0"><span class="coin"><b>${p.n}</b>${badge}</span><i class="ld"></i>${lb}</a>`;
    })
    .join("\n        ");
  const rS = cfg.rSum;
  const flagH = cfg.flagH;
  const billboards = `
        <span class="bb st s-start" style="left:${start.x}px;top:${start.y}px;--r:${cfg.rStart}px;--d:${O.fill0 - 0.1}s"><span class="coin"></span><i class="ld"></i><span class="lb"><b>البداية</b></span></span>
        ${stationHtml}
        <a class="bb st s-sum" data-station="summit" data-x="${summit.x}" data-y="${summit.y}" data-r="${rS}" style="left:${summit.x}px;top:${summit.y}px;--r:${rS}px;--d:${O.flag - 0.06}s" role="button" tabindex="0"><span class="coin"><i></i></span><i class="ld"></i><span class="lb" style="--d:${O.sumLb}s"><b>جاهز للوظيفة</b><small>القمة<i class="sep"></i>مطابقة ${ltr("100%")}</small></span></a>
        <span class="bb flag" style="left:${summit.x}px;top:${summit.y}px;--r:0px"><svg width="${cfg.flagW}" height="${flagH}" viewBox="0 0 ${cfg.flagW} ${flagH}" style="left:${-(cfg.flagW - 3)}px;top:${-flagH}px"><path class="pole" style="--d:${O.flag}s" d="M${cfg.flagW - 3} ${flagH}V3"/><path class="pen" style="--d:${O.flag + 0.17}s" d="M${cfg.flagW - 4.5} 4L4 ${r1(4 + cfg.penH / 2)}L${cfg.flagW - 4.5} ${4 + cfg.penH}Z"/></svg></span>
        <span class="bb you" style="left:${way.x}px;top:${way.y}px;--r:${cfg.youH / 2}px;--d:${O.you}s"><i class="wp"></i><span class="pill"><span class="face"><svg viewBox="0 0 96 96"><use href="#av-k"/></svg></span><span class="tx"><b>أنت هنا</b><small>مطابقتك <i class="count" style="--n:${MATCH};--d:${O.count}s;--t:${O.countD}s"></i></small></span></span></span>
        ${peaks.map((p) => `<span class="bb peak" style="left:${p.x}px;top:${p.y}px;--r:8px;--d:${O.br + 0.2}s"><svg width="24" height="22" viewBox="0 0 24 22"><path d="M12 2.500 22 19.500H2z"/></svg><span class="lb"><b>${p.title}</b>${phone ? "" : `<small>الآن ${ltr(p.now + "%")}<i class="sep"></i>بعد المسار ${ltr(p.after + "%")}</small>`}</span></span>`).join("\n        ")}`;

  const dotsRow = `<span class="dots">${STATIONS.map((s) => `<i class="${s.state === "done" ? "d" : s.state === "now" ? "n" : ""}"></i>`).join("")}</span>`;
  const sign = phone
    ? `<div class="sign"><div class="e">مسارك نحو</div><h2>محلل بيانات</h2></div>`
    : `<div class="sign"><div class="e">مسارك نحو</div><h2>محلل بيانات</h2><div class="pg"><span><b>${DONE}</b> من <b>${TOTAL}</b> مراحل</span>${dotsRow}</div></div><span class="seg2"><b>خريطة</b><span>قائمة</span></span>`;

  return `
    <div class="map${phone ? " sm" : ""}" id="${id}" style="--ox:${start.x}px" data-fx="${cfg.focus.x}" data-fy="${cfg.focus.y}" data-pitch="${cfg.focus.pitch}" data-scale="${cfg.focus.scale}" data-keep="${cfg.focus.keep}" data-current="${NOW.n}">
      <div class="cam">
        <div class="plane">
          <svg class="terrain" width="${W + 2 * BL}" height="${H + BT + BB}" viewBox="${-BL} ${-BT} ${W + 2 * BL} ${H + BT + BB}" style="left:${-BL}px;top:${-BT}px" aria-hidden="true">${terrain}<path class="svy" d="${crosses}"/>${marks}</svg>${trail}
        ${billboards}
        </div>
      </div>
      ${sign}
      <button class="map-back" type="button">${ic("i-back")}رجوع للخريطة</button>
    </div>`;
}

// ---------- the station card (desktop: a card beside the station; phone: a bottom sheet above the tab bar) ----------
function matchBar(before, after, cls) {
  return `<div class="mbar ${cls}"><i class="pv" style="width:${before}%"></i><i class="th" style="width:${after - before}%"></i></div>`;
}
function card(s) {
  const head = (eye, title, sub) => `<header class="fi"><div class="eye">${eye}</div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ""}<button class="fc-x" type="button" aria-label="إغلاق">${ic("i-close")}</button></header>`;
  const eye = `<i class="dot"></i>المرحلة ${s.n} من ${TOTAL}<i class="sep"></i><b>${stateWord[s.state]}</b>`;
  const title = `${s.skill}${stageStars(s, "lg")}`;
  const sk = `${s.state === "done" ? "النجمة" : "ترفع مهارتك إلى النجمة"} ${s.star} من ${s.slots} في ${s.skill}`;
  const course = (k) => `<div class="blk fi"><small>${k}</small><b>${s.course}</b>${s.sub ? `<span>${s.sub}</span>` : ""}<div class="stats"><span>${ic("i-clock")}${hrs(s.h)}</span><span>${ic("i-lessons")}${lessons(s.les)}</span>${s.state === "done" ? "" : spot(s.xp)}</div></div>`;
  const match = `<div class="blk fi"><div class="row"><small>أثرها على المطابقة</small><b class="up">${ltr("+" + s.gain + "%")}</b></div>${matchBar(s.before, s.after, s.state)}<div class="row sub"><span>${s.state === "done" ? "قبلها" : s.state === "now" ? "الآن" : "قبلها"} ${ltr(s.before + "%")}</span><span>بعدها <b>${ltr(s.after + "%")}</b></span></div></div>`;
  let prog, btn = "";
  if (s.state === "done") {
    prog = `<div class="blk ev fi"><small>تقدّمك<i class="sep"></i>أثبتتها سيرتك</small><q>«${s.ev}»</q><span class="stamp"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="34"/><circle cx="38" cy="38" r="27.500" stroke-dasharray="1.500 4.260"/></svg><b>تمّ</b></span></div>`;
  } else if (s.state === "now") {
    prog = `<div class="blk fi"><div class="row"><small>تقدّمك</small><b>لم تبدأ بعد<i class="sep"></i>0 من ${lessons(s.les)}</b></div><div class="les">${"<i></i>".repeat(s.les)}</div></div>`;
    btn = `<a class="btn btn-p fi">ابدأ الدورة${ic("i-arrow")}</a>`;
  } else if (s.state === "next") {
    prog = `<div class="blk fi"><div class="row"><small>تقدّمك</small><b>لم تبدأ بعد</b></div><div class="les">${"<i></i>".repeat(s.les)}</div><p class="note">${s.why}.</p></div>`;
    btn = `<a class="btn btn-s fi">افتح الدورة${ic("i-arrow")}</a>`;
  } else {
    prog = `<div class="blk lockb fi">${ic("i-lock", "mut")}<div><b>مقفلة</b><p class="note">${s.why}.</p></div></div>`;
  }
  const order = s.state === "done" ? [prog, course("الدورة المقابلة · مثبتة"), match] : [course("الدورة"), match, prog];
  return `<article class="fcard c-${s.state}" data-for="${s.n}">${head(eye, title, sk)}${order.join("")}${btn}</article>`;
}
function summitCard() {
  return `<article class="fcard c-sum" data-for="summit"><header class="fi"><div class="eye"><i class="dot"></i>القمة<i class="sep"></i><b>نهاية المسار</b></div><h3>جاهز للوظيفة</h3><button class="fc-x" type="button" aria-label="إغلاق">${ic("i-close")}</button></header>
    <div class="blk fi"><small>هدفك</small><b>محلل بيانات</b><span>وادي الغيم للبيانات<i class="sep"></i>الرياض</span><span class="tag">جهة تجريبية</span></div>
    <div class="blk fi"><div class="row"><small>مطابقتك</small><b>${ltr(MATCH + "%")} من ${ltr("100%")}</b></div>${matchBar(MATCH, 100, "next")}<div class="row sub"><span>الآن ${ltr(MATCH + "%")}</span><span>عند القمة <b>${ltr("100%")}</b></span></div></div>
    <div class="blk fi"><div class="row"><small>تقدّمك</small><b>${DONE} من ${TOTAL} مراحل<i class="sep"></i>بقي ${hrs(hoursLeft)}</b></div><div class="les sm8">${STATIONS.map((s) => `<i class="${s.state === "done" ? "d" : ""}"></i>`).join("")}</div></div>
    <a class="btn btn-s fi">عرض الوظيفة${ic("i-arrow")}</a></article>`;
}
const cards = STATIONS.map(card).join("\n") + "\n" + summitCard();

// ---------- the two sheets ----------
const desktop = sheet({
  id: "map-d", W: 792, H: 768, cx: 462, yTop: 124, yBottom: 742, amp: 24, phone: false,
  weights: { first: 0.8, done: 1, toNow: 1.85, way: 0.47, afterNow: 1.5, ahead: 1.3, toSummit: 1.35 },
  rDone: 20, rNow: 27, rNext: 21, rSum: 15, rStart: 9, road: 14, youH: 48, flagW: 46, flagH: 74, penH: 28,
  bleed: [300, 640, 280],
  peaks: [{ x: 262, y: 56 }, { x: 716, y: 72 }],
  focus: { x: 560, y: 430, pitch: 54, scale: 1.9, keep: 1.05 },
});
const phone = sheet({
  id: "map-p", W: 366, H: 600, cx: 236, yTop: 88, yBottom: 580, amp: 13, phone: true,
  weights: { first: 0.7, done: 1, toNow: 1.8, way: 0.46, afterNow: 1.4, ahead: 1.2, toSummit: 1.2 },
  rDone: 20, rNow: 24, rNext: 20, rSum: 12, rStart: 7, road: 12, youH: 38, flagW: 32, flagH: 52, penH: 20,
  bleed: [220, 420, 240],
  peaks: [{ x: 96, y: 30 }, { x: 318, y: 34 }],
  focus: { x: 150, y: 168, pitch: 52, scale: 1.7, keep: 1 },
});

// ---------- page ----------
const css = fs.readFileSync(path.join(dir, "final-home.css.txt"), "utf8");
const runtime = fs.readFileSync(path.join(dir, "final-home.runtime.js"), "utf8");
const notes = fs.readFileSync(path.join(dir, "final-home.notes.txt"), "utf8");
const lbRow = (rank, av, name, xp, me) => `<div class="lbr${me ? " me" : ""}"><span class="rk">${rank}</span><span class="av plain" style="--s:${me ? 32 : 28}px"><span class="face"><svg viewBox="0 0 96 96"><use href="#${av}"/></svg></span></span><span class="nm">${name}${me ? "<small>أنت</small>" : ""}</span><span class="spot"><svg viewBox="0 0 13 12"><use href="#peak"/></svg>${xp}</span></div>`;
const nav = [["مساري", "mark", 1], ["المهارات", "i-tree"], ["الدورات", "i-courses"], ["سيرتي", "i-cv"], ["الوظائف", "i-jobs"], ["طلباتي", "i-apply"], ["المتصدرون", "i-leaders"], ["ملفي", "i-profile"]];
const levelRing = `<svg class="rg" viewBox="0 0 100 100"><circle class="t" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="81 19" transform="rotate(124.2 50 50)"/><circle class="p" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="12 100" transform="rotate(124.2 50 50)"/></svg>`;
const face = `<span class="face"><svg viewBox="0 0 96 96"><use href="#av-k"/></svg></span>`;

const html = `<!doctype html>
<!--
${notes.trimEnd()}
-->
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>دليلك · مسارك</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    ${icons.map(symbol).join("\n    ")}
    <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.400l2.650 5.450 5.950.800-4.350 4.150 1.050 5.900L12 16.850 6.700 19.700l1.050-5.900L3.400 9.650l5.950-.800z"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="M6.500 6.500l11 11M17.500 6.500l-11 11"/></symbol>
    <symbol id="i-back" viewBox="0 0 24 24"><path d="M5 12h12.500M13 7.500l4.500 4.500-4.500 4.500"/></symbol>
    <symbol id="i-lessons" viewBox="0 0 24 24"><path d="M9.500 7h10M9.500 12h10M9.500 17h6"/><circle cx="5" cy="7" r="1.250"/><circle cx="5" cy="12" r="1.250"/><circle class="wp" cx="5" cy="17" r="1.750"/></symbol>
    ${avatarParts.map(defLine).join("\n    ")}
    ${avatars.map(symbol).join("\n    ")}
    <symbol id="av-k" viewBox="0 0 96 96"><rect width="96" height="96" fill="#FFDED1"/><path d="M-4 34c16-12 30-12 46-3s34 8 58-9M-4 52c14-10 26-10 40-4" fill="none" stroke="#F4BEA9" stroke-width="1.500"/><use href="#a-shoulders" fill="#0E1E3D"/><path d="M39 74c2.500 4.500 5.500 6.500 9 6.500s6.500-2 9-6.500" fill="none" stroke="#2E4A7A" stroke-width="1.500" stroke-linecap="round"/><use href="#a-neck" fill="#D39A71"/><use href="#a-head" fill="#E3AE86"/><use href="#a-hair-m" fill="#2B1D18"/><use href="#a-eyes"/><use href="#a-smile"/></symbol>
  </defs>
</svg>

<div class="cap"><b>Dalilak · the home map · final</b><i>1440 × 900 · press a station</i></div>
<div id="home-frame">
  <aside class="rail">
    <div class="brand"><span class="lock-h word"><svg class="mark" width="32" height="32"><use href="#mark"/></svg><span>دليلك</span></span></div>
    <nav class="nav">
      ${nav.map(([t, i, on]) => `<a${on ? ' class="on"' : ""}>${i === "mark" ? `<svg class="ic navmark"><use href="#mark"/></svg>` : ic(i)}${t}</a>`).join("\n      ")}
    </nav>
    <div class="daily">
      <div class="hd">${ic("i-streak")}السلسلة اليومية<b>1</b><small>يوم</small></div>
      <div class="wk"><span class="d"><u></u>ح</span><span class="d"><u></u>ن</span><span class="d"><u></u>ث</span><span class="d now"><u></u>ر</span><span class="d"><u></u>خ</span><span class="d"><u></u>ج</span><span class="d"><u></u>س</span></div>
    </div>
    <div class="demo-line">عرض تجريبي · بيانات تجريبية</div>
  </aside>

  <main class="hmain">
    <header class="hhead">
      <div><h1>مساء الخير، خالد</h1><p>بقيت مرحلتان بينك وبين القمة: ${hrs(hoursLeft)} تعلّم.</p></div>
      <div class="uchip">
        <div>${ic("i-leaders")}<span><span class="k">ترتيبك</span><br><span class="v num">18</span></span></div>
        <div><span><span class="k">نقاط الخبرة</span><br><span class="spot" style="font-size:15px"><svg viewBox="0 0 13 12"><use href="#peak"/></svg>180 / 350 XP</span></span>
          <span class="xpbar" style="width:84px"><span class="bar" style="height:9px"><span class="seg"><i style="width:75%"></i></span><span class="seg"></span><span class="seg"></span><span class="seg"></span><span class="seg"></span></span></span></div>
        <div><span style="text-align:start"><span class="v">خالد</span><br><span class="k">المستوى 2 · مستكشف</span></span>
          <span class="av s48" style="--s:50px">${face}${levelRing}<b class="lv">2</b></span></div>
      </div>
    </header>

    <div class="hbody">
      ${desktop}

      <aside class="hside">
        <div class="card ink nextc">
          <div class="top"><span>خطوتك التالية</span><span>المرحلة ${NOW.n} من ${TOTAL}</span></div>
          <h3>${NOW.skill}${stageStars(NOW, "lg")}</h3>
          <p>دورة «${NOW.course}»</p>
          <div class="meta"><span>${ic("i-clock")}${hrs(NOW.h)}</span><span>${ic("i-lessons")}${lessons(NOW.les)}</span>${spot(NOW.xp)}</div>
          <div class="gain">
            <div><span class="k">مهارة ${NOW.skill}</span><span class="v">${starRow(0, 3, "gn")}<i>من 0 إلى 1</i></span></div>
            <div><span class="k">مطابقتك بعدها</span><span class="v num">${ltr(NOW.after + "%")}<i class="ltr">+${NOW.gain}</i></span></div>
          </div>
          <a class="btn btn-p">ابدأ الدورة${ic("i-arrow")}</a>
        </div>

        <div class="card matchc">
          <div class="ring" style="--s:88px"><svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="50"/><path class="prg draw" pathLength="1" style="--d:1.76s;--t:.85s;--e:cubic-bezier(.2,.7,.2,1)" d="M60 10A50 50 0 1 0 107.55 75.45"/><circle class="end fade" style="--d:2.5s" cx="107.55" cy="75.45" r="7.500"/></svg><b><i class="count" style="--n:${MATCH};--d:1.76s;--t:.85s"></i></b></div>
          <div><h4>مطابقتك مع محلل بيانات</h4><p>مهارتان تفصلانك عن القمة</p>
            <div class="skills"><span class="chip chip-s miss">Power BI</span><span class="chip chip-s miss">الإحصاء${starRow(1, 1, "xs")}</span></div></div>
        </div>

        <div class="card rankc">
          <div class="hd">المتصدرون هذا الأسبوع<a>الكل</a></div>
          ${lbRow(1, "av-5", "فيصل ق.", 980)}
          ${lbRow(2, "av-6", "سلطان م.", 910)}
          ${lbRow(3, "av-7", "مشعل ر.", 860)}
          <div class="gap"><i></i></div>
          ${lbRow(18, "av-k", "خالد", 180, true)}
          <div class="hint"><span>يفصلك <b class="ltr">10 XP</b> عن المركز 17</span><span class="tag">مستخدمون تجريبيون</span></div>
        </div>

        <div class="launch"><span class="dal">${ic("i-advisor")}</span>اسأل دليل عن مسارك…<kbd>Ctrl K</kbd></div>
      </aside>
    </div>
  </main>
  <div class="flayer" data-map="map-d">
    <i class="fleader"></i>
    ${cards}
  </div>
</div>

<div class="cap" style="width:390px"><b>Phone</b><i>390 × 844 · the station card is a bottom sheet</i></div>
<div id="phone-frame">
  <div class="p-top">
    <span class="lock-h word" style="font-size:22px;gap:6px"><svg class="mark" width="26" height="26"><use href="#mark"/></svg><span>دليلك</span></span>
    <div class="p-stats"><span>${ic("i-streak")}1</span><span class="spot" style="font-size:13.5px"><svg viewBox="0 0 13 12"><use href="#peak"/></svg>180</span><span class="av s48" style="--s:40px;--bg:var(--paper)">${face}${levelRing}<b class="lv">2</b></span></div>
  </div>
  ${phone}
  <div class="card ink p-next">
    <span class="n">${NOW.n}</span>
    <div class="t"><div class="e">خطوتك التالية</div><h3>${NOW.skill}${stageStars(NOW)}</h3></div>
    <a class="btn btn-p">ابدأ الدورة${ic("i-arrow")}</a>
  </div>
  <nav class="p-tabs">
    <a class="on"><svg class="ic navmark"><use href="#mark"/></svg>مساري</a>
    <a>${ic("i-courses")}الدورات</a>
    <span class="ask">${ic("i-advisor")}</span>
    <a>${ic("i-jobs")}الوظائف</a>
    <a><svg class="ic"><circle cx="5.500" cy="12" r="1.500"/><circle cx="12" cy="12" r="1.500"/><circle class="wp" cx="18.500" cy="12" r="1.750"/></svg>المزيد</a>
  </nav>
  <div class="flayer sheet" data-map="map-p">
    ${cards}
  </div>
</div>

<script>
${runtime}
</script>
</body>
</html>
`;
const out = path.join(dir, COUNT === 4 ? "final-home-4.html" : "final-home.html");
fs.writeFileSync(out, html.replace(/\r\n/g, "\n"), "utf8");
console.log(`wrote ${path.relative(process.cwd(), out)} (${(html.length / 1024).toFixed(0)} KB, ${TOTAL} stations, match ${MATCH}%, ${hoursLeft} h left, ring d1 ${RING_D1.toFixed(1)})`);
