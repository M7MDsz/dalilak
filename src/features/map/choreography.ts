// Owner: map. `map-open` in its three forms (full, short, catch-up) as Web Animations on transforms and opacity (plus the
// stroke offset of the road while it draws). No requestAnimationFrame loop, no timers inside a beat: every beat is one
// animation with a delay, all created at once. The beats are the approved page's
// (design/explore/darb/map/final-home.notes.txt); their times come from geometry.ts (`timeline`). The camera's flights
// are in camera.ts.
//
// The opening uses fill "backwards" only: each element waits in its first keyframe and, when its beat ends, falls back to
// its CSS resting style. So when the opening is over (or cut short) the sheet is the untouched resting page.
import { FILL_EASE, type MapGeometry, type OpenForm } from "./geometry";

const E_CAM = "cubic-bezier(.22,1,.36,1)"; // the camera levelling
const E_OUT = "cubic-bezier(.2,.7,.2,1)"; // things arriving
const E_POP = "cubic-bezier(.3,1.3,.6,1)"; // a coin settling: one small overshoot, no bounce
const E_FILL = `cubic-bezier(${FILL_EASE.join(",")})`;

type Frames = Keyframe[];

function all(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

// ── map-open ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Opening {
  /** Jump to the resting sheet now (a click during the opening acts on the final state). */
  readonly finish: () => void;
}

/** Plays one form of `map-open` on the sheet inside `root`. Returns at once; the caller ends the phase at `timeline.rest`. */
export function playOpening(root: HTMLElement, g: MapGeometry, form: OpenForm): Opening {
  const T = g.timeline[form];
  const list: Animation[] = [];
  const an = (el: Element | null | undefined, frames: Frames, at: number, dur: number, easing = "linear") => {
    if (!el) return;
    list.push(el.animate(frames, { delay: Math.max(0, at) * 1000, duration: Math.max(1, dur * 1000), easing, fill: "backwards" }));
  };
  const FADE: Frames = [{ opacity: 0 }, { opacity: 1 }];
  const DRAW: Frames = [
    { strokeDashoffset: 1, opacity: 0 },
    { strokeDashoffset: 0.97, opacity: 1, offset: 0.03 },
    { strokeDashoffset: 0, opacity: 1 },
  ];
  const COIN: Frames = [
    { opacity: 0, transform: "scale(.55)" },
    { opacity: 1, offset: 0.45 },
    { opacity: 1, transform: "scale(1)" },
  ];
  const RISE: Frames = [
    { opacity: 0, transform: "translateY(7px)" },
    { opacity: 1, transform: "translateY(0px)" },
  ];
  const DROP: Frames = [
    { opacity: 0, transform: "translateY(-14px)" },
    { opacity: 1, transform: "translateY(0px)" },
  ];
  const plane = root.querySelector<HTMLElement>(".dm-plane");
  const draw = (name: string, at: number, dur: number, easing?: string) => {
    for (const el of all(root, `[data-o="${name}"]`)) an(el, DRAW, at, dur, easing);
  };

  an(root.querySelector(".dm-terrain"), FADE, 0, T.terrainD);

  if (form === "full") {
    // beat 1: the sheet is lying away from you and levels out to face you (the same camera the flight uses); every
    // billboard takes the opposite pitch, so coins, flag and walker stand upright in every frame
    const pivot = `translate3d(${g.start.x}px,${g.height}px,0)`;
    const back = `translate3d(${-g.start.x}px,${-g.height}px,0)`;
    an(
      plane,
      [
        { transform: `${pivot} translate3d(0,46px,0) rotateX(42deg) scale3d(.9,.9,.9) ${back}` },
        { transform: `${pivot} translate3d(0,0px,0) rotateX(0deg) scale3d(1,1,1) ${back}` },
      ],
      0,
      T.cam,
      E_CAM,
    );
    for (const bb of all(root, ".dm-bb")) an(bb, [{ transform: "rotateX(-42deg)" }, { transform: "rotateX(0deg)" }], 0, T.cam, E_CAM);
    for (const el of all(root, ".dm-furniture")) an(el, FADE, 0.15, 0.4);
    an(root.querySelector('[data-o="start"]'), COIN, T.start, 0.38, E_POP);
    an(root.querySelector('[data-o="start-lb"]'), RISE, T.start + 0.12, 0.34, E_OUT);
    draw("solid", T.fill0, T.fillD, E_FILL);
    draw("leg", T.leg0, T.legD);
    draw("ahead", T.ahead0, T.aheadD);
    for (const st of g.stations) {
      const el = root.querySelector(`[data-key="${st.key}"]`);
      if (!el) continue;
      const t = st.t.full;
      an(el.querySelector(".dm-coin"), COIN, t, st.look === "now" ? 0.46 : 0.38, E_POP);
      an(el.querySelector(".dm-ld"), FADE, t + 0.12, 0.2);
      an(el.querySelector(".dm-lb"), RISE, st.look === "now" ? T.nowLabel : t + 0.12, 0.34, E_OUT);
      an(root.querySelector(`[data-gs="${st.key}"]`), FADE, t, 0.3);
    }
    an(root.querySelector(".dm-wp"), COIN, T.you, 0.34, E_POP);
    an(root.querySelector(".dm-pill"), DROP, T.you + 0.06, T.youD, E_OUT);
    an(root.querySelector('[data-key="summit"] .dm-coin'), COIN, T.flag - 0.06, 0.38, E_POP);
    an(root.querySelector('[data-gs="summit"]'), FADE, T.flag, 0.3);
    an(root.querySelector('[data-key="summit"] .dm-ld'), FADE, T.summitLabel, 0.2);
    an(root.querySelector('[data-key="summit"] .dm-lb'), RISE, T.summitLabel, 0.34, E_OUT);
    an(root.querySelector(".dm-pole"), [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], T.flag, 0.26, E_OUT);
    an(root.querySelector(".dm-pen"), [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], T.flag + 0.17, 0.3, E_OUT);
    an(root.querySelector(".dm-brn"), FADE, T.branches, 0.3);
    for (const peak of all(root, ".dm-peak")) an(peak.firstElementChild, FADE, T.branches + 0.2, 0.3), an(peak.querySelector(".dm-lb"), FADE, T.branches + 0.2, 0.3);
  } else if (form === "short") {
    // the same story with fewer beats: the sheet is already level
    draw("solid", T.fill0, T.fillD, E_FILL);
    draw("leg", T.leg0, T.legD);
    draw("ahead", T.ahead0, T.aheadD);
    for (const st of g.stations) {
      const el = root.querySelector(`[data-key="${st.key}"]`);
      if (!el) continue;
      const t = st.t.short;
      if (st.look === "now") an(el.querySelector(".dm-coin"), COIN, t, 0.3, E_POP);
      else an(el.querySelector(".dm-coin"), FADE, t, 0.2);
      an(el.querySelector(".dm-ld"), FADE, t + 0.04, 0.2);
      an(el.querySelector(".dm-lb"), FADE, t + 0.04, 0.2);
      an(root.querySelector(`[data-gs="${st.key}"]`), FADE, t, 0.2);
    }
    an(root.querySelector(".dm-wp"), COIN, T.you, T.youD, E_POP);
    an(root.querySelector(".dm-pill"), [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "translateY(0px)" }], T.you, T.youD, E_OUT);
    an(root.querySelector('[data-key="summit"] .dm-coin'), FADE, T.flag, 0.2);
    an(root.querySelector('[data-key="summit"] .dm-lb'), FADE, T.flag, 0.2);
    an(root.querySelector(".dm-flag"), FADE, T.flag, 0.2);
    an(root.querySelector(".dm-brn"), FADE, T.branches, 0.2);
    for (const peak of all(root, ".dm-peak")) an(peak, FADE, T.branches, 0.2);
  } else {
    // catch-up: the covered line climbs; each station the CV proved turns done as the line passes it; «أنت هنا» rides the
    // tip of the line to where the user stands; then the next station answers
    for (const el of all(root, "[data-cov]")) an(el, DRAW, T.fill0, T.fillD, E_FILL);
    for (const st of g.stations) {
      const el = root.querySelector(`[data-key="${st.key}"]`);
      if (!el) continue;
      if (st.look === "done") {
        const t = st.t["catch-up"];
        an(el.querySelector(".dm-ghost"), [{ opacity: 1 }, { opacity: 0 }], t, 0.2);
        an(el.querySelector(".dm-coin"), COIN, t, 0.38, E_POP);
        an(el.querySelector(".dm-ld"), FADE, t + 0.1, 0.2);
        an(el.querySelector(".dm-lb"), RISE, t + 0.1, 0.34, E_OUT);
      } else if (st.look === "now") {
        an(el.querySelector(".dm-coin"), COIN, T.now, 0.46, E_POP);
        an(el.querySelector(".dm-ld"), FADE, T.nowLabel, 0.2);
        an(el.querySelector(".dm-lb"), RISE, T.nowLabel, 0.34, E_OUT);
        an(root.querySelector(`[data-gs="${st.key}"]`), FADE, T.now, 0.3);
      }
    }
    draw("leg", T.leg0, T.legD);
    const travel: Frames = g.youTravel.map(([x, y]) => ({ transform: `translate(${(x - g.you.x).toFixed(1)}px,${(y - g.you.y).toFixed(1)}px)` }));
    if (travel.length > 1) {
      an(root.querySelector(".dm-wp"), travel, T.you, T.youD, E_FILL);
      an(root.querySelector(".dm-pill"), travel, T.you, T.youD, E_FILL);
      // the marker sets out from the trailhead, through the sign's corner: the sign arrives once it has passed
      an(root.querySelector(".dm-sign"), FADE, T.you + T.youD * 0.55, 0.3);
    }
  }

  return {
    finish: () => {
      for (const a of list) {
        try {
          a.cancel();
        } catch {
          /* already gone */
        }
      }
    },
  };
}
