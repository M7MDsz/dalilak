// Owner: map. The one camera of the sheet: `station-focus`, the direct flight from one station to another while a card is
// open, and `station-return`. Web Animations on transforms and opacity only, so the compositor carries the flight. Times
// are the approved page's (design/explore/darb/map/final-home.notes.txt); the hop is new.
import type { MapGeometry } from "./geometry";

const E_OUT = "cubic-bezier(.2,.7,.2,1)"; // things arriving

/** station-focus / station-return: every number in one place (milliseconds). */
export const FLIGHT = {
  ease: "cubic-bezier(.5,0,.15,1)", // the camera: a short take-off, the sweep, then a long soft landing
  easeBack: "cubic-bezier(.4,0,.2,1)",
  easeRise: "cubic-bezier(.33,1,.68,1)", // the place rising to meet you
  easeIn: "cubic-bezier(.5,0,.75,0)",
  cam: 1200, // the flight
  labelsOut: 160, // map labels and furniture clear out of the way
  riseAt: 640, // the station lifts off the sheet; a survey ring draws round its foot
  rise: 560,
  lift: 16,
  grow: 1.16,
  cardAt: 980, // the card arrives as the camera lands
  card: 440,
  rowAt: 1080, // its rows rise one after another
  rowStep: 70,
  row: 480,
  barAt: 1480, // the match bar grows its new part
  bar: 520,
  out: { card: 180, sheet: 260, sink: 220, camAt: 60, cam: 1000, labelsAt: 620, labels: 280 },
  /** One station to another while a card is open: a pan over the pitched sheet. */
  hop: { cam: 760, sink: 200, riseAt: 300, rise: 460, rowAt: 60, rowStep: 45, row: 380 },
} as const;

function all(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

export interface FlightTarget {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface FlightOptions {
  /** The card is the phone's bottom sheet. */
  readonly sheet: boolean;
  /** Reduced motion or still frames: nothing flies. */
  readonly instant: boolean;
}

/**
 * `focus` flies to a station (from the overview, or straight from another station while a card is open); `release`
 * flies back to the overview.
 *
 * One rule makes every flight interruptible: an animation only names where things END. Where they start is whatever is
 * on screen, which is always held in plain inline styles: the resting pose written when a flight lands (`commit`), or the
 * pose frozen out of the running animations when a new press arrives mid-flight (`freeze`). So a press during a flight
 * turns the camera from where it is, and between flights no animation is left running: the sheet is drawn sharp at its
 * new scale and costs nothing at rest.
 */
export class Camera {
  private running: Animation[] = [];
  private target: FlightTarget | null = null;
  private token = 0;
  private timer = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly g: MapGeometry,
  ) {}

  private get plane(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(".dm-plane");
  }
  private get ring(): SVGElement | null {
    return this.root.querySelector<SVGElement>(".dm-fring");
  }
  private get shadow(): SVGElement | null {
    return this.root.querySelector<SVGElement>(".dm-fshadow");
  }
  private get back(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(".dm-back");
  }
  private get leader(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(".dm-leader");
  }
  /** The camera's pose with the pivot written out, so the pitch and the approach always turn about the station. */
  private pose(t: FlightTarget, on: boolean): string {
    const f = this.g.focus;
    return on
      ? `translate3d(${f.x}px,${f.y}px,0px) rotateX(${f.pitch}deg) scale3d(${f.scale},${f.scale},${f.scale}) translate3d(${-t.x}px,${-t.y}px,0px)`
      : `translate3d(${t.x}px,${t.y}px,0px) rotateX(0deg) scale3d(1,1,1) translate3d(${-t.x}px,${-t.y}px,0px)`;
  }
  /** Billboards take the exact opposite pitch, so coins, flag and walker stay upright in every frame. */
  private upright(on: boolean): string {
    const f = this.g.focus;
    const q = f.keep / f.scale;
    return on ? `rotateX(${-f.pitch}deg) scale3d(${q},${q},${q})` : "rotateX(0deg) scale3d(1,1,1)";
  }
  private lifted(on: boolean): string {
    return on ? `translateY(${-FLIGHT.lift}px) scale(${FLIGHT.grow})` : "translateY(0px) scale(1)";
  }
  private coinOf(key: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`[data-key="${key}"] .dm-coin`);
  }
  private placeFoot(t: FlightTarget) {
    const ring = this.ring;
    const shadow = this.shadow;
    ring?.setAttribute("cx", String(t.x));
    ring?.setAttribute("cy", String(t.y + t.r));
    ring?.setAttribute("r", String(t.r * 0.9 + 9));
    shadow?.setAttribute("cx", String(t.x));
    shadow?.setAttribute("cy", String(t.y + t.r + 1));
    shadow?.setAttribute("rx", String(t.r * 0.8));
    shadow?.setAttribute("ry", String(t.r * 0.3));
  }
  /** The dotted leader from the card to the lifted coin's side, in window pixels (wide sheets only). */
  private placeLeader(t: FlightTarget, card: HTMLElement) {
    const leader = this.leader;
    if (!leader) return;
    const f = this.g.focus;
    const cos = Math.cos((f.pitch * Math.PI) / 180);
    const cy = f.y + t.r * f.scale * cos - (t.r + FLIGHT.lift) * f.keep;
    const x0 = card.offsetLeft + card.offsetWidth + 7;
    const x1 = f.x - t.r * f.keep * FLIGHT.grow - 9;
    leader.style.left = `${x0}px`;
    leader.style.top = `${cy}px`;
    leader.style.width = `${Math.max(0, x1 - x0)}px`;
  }
  private stop() {
    window.clearTimeout(this.timer);
    for (const a of this.running) {
      try {
        a.cancel();
      } catch {
        /* already gone */
      }
    }
    this.running = [];
  }
  /** A press arrived mid-flight: hold everything exactly where it is on screen, as inline styles. */
  private freeze(card: HTMLElement | null) {
    if (this.running.length === 0) return;
    const ring = this.ring;
    const things: (Element | null)[] = [this.plane, ...all(this.root, ".dm-bb, .dm-q, .dm-coin"), ring, this.shadow, this.back, this.leader, card, ...(card ? all(card, ".dm-fi, .dm-th") : [])];
    const held = things
      .filter((el): el is HTMLElement | SVGElement => el !== null)
      .map((el) => {
        const cs = getComputedStyle(el);
        return { el, transform: cs.transform, opacity: cs.opacity, offset: cs.strokeDashoffset };
      });
    this.stop();
    for (const h of held) {
      h.el.style.transform = h.transform === "none" ? "" : h.transform;
      h.el.style.opacity = h.opacity;
      if (h.el === ring) h.el.style.strokeDashoffset = h.offset;
    }
  }
  private to(el: Element | null | undefined, end: Keyframe, o: KeyframeAnimationOptions) {
    if (!el) return;
    this.running.push(el.animate([end], { fill: "both", easing: FLIGHT.ease, ...o }));
  }
  /** Writes the resting state (focused on the target, or the untouched overview) as inline styles. */
  private commit(card: HTMLElement | null) {
    const t = this.target;
    const plane = this.plane;
    if (plane) plane.style.transform = t !== null ? this.pose(t, true) : "";
    for (const bb of all(this.root, ".dm-bb")) {
      bb.style.transform = t !== null ? this.upright(true) : "";
      bb.style.opacity = "";
    }
    for (const q of all(this.root, ".dm-q")) {
      q.style.opacity = t !== null ? "0" : "";
      q.style.transform = "";
    }
    const lifted = t !== null ? this.coinOf(t.key) : null;
    for (const coin of all(this.root, ".dm-coin")) {
      coin.style.transform = coin === lifted ? this.lifted(true) : "";
      coin.style.opacity = "";
    }
    const ring = this.ring;
    if (ring) {
      ring.style.transform = "";
      ring.style.strokeDashoffset = t !== null ? "0" : "";
      ring.style.opacity = t !== null ? "1" : "";
    }
    const shadow = this.shadow;
    if (shadow) {
      shadow.style.transform = "";
      shadow.style.opacity = t !== null ? "0.2" : "";
    }
    const back = this.back;
    if (back) {
      back.style.transform = "";
      back.style.opacity = t !== null ? "1" : "";
    }
    const leader = this.leader;
    if (leader) {
      leader.style.transform = "";
      leader.style.opacity = t !== null ? "1" : "";
    }
    if (card) {
      for (const el of [card, ...all(card, ".dm-fi, .dm-th")]) {
        el.style.transform = "";
        el.style.opacity = "";
      }
    }
  }
  private async landed(token: number): Promise<boolean> {
    try {
      await Promise.all(this.running.map((a) => a.finished));
    } catch {
      return false; // turned round by a newer press
    }
    return token === this.token;
  }

  /**
   * Flies to `target`: from the overview (station-focus, 2.0 s to rest), or straight from the station the camera is at
   * (a pan over the pitched sheet). `card` is the card React has just rendered for the target. Resolves true when it
   * lands, false when a newer press turned the camera first.
   */
  async focus(target: FlightTarget, card: HTMLElement | null, opts: FlightOptions): Promise<boolean> {
    const token = ++this.token;
    this.freeze(card);
    this.stop();
    const hop = this.target !== null;
    const coin = this.coinOf(target.key);
    const ring = this.ring;
    const shadow = this.shadow;
    const leader = this.leader;

    if (opts.instant) {
      // no flight: the card opens in place and the pressed station is ringed
      this.target = null;
      this.commit(card);
      this.target = target;
      if (ring) {
        // flat sheet: the ring goes round the coin itself
        ring.setAttribute("cx", String(target.x));
        ring.setAttribute("cy", String(target.y));
        ring.setAttribute("r", String(target.r + 7));
        ring.style.strokeDashoffset = "0";
        ring.style.opacity = "1";
      }
      return true;
    }
    this.target = target;

    const F = FLIGHT;
    const cam = hop ? F.hop.cam : F.cam;
    const riseAt = hop ? F.hop.riseAt : F.riseAt;
    const rise = hop ? F.hop.rise : F.rise;
    const cardAt = hop ? 0 : F.cardAt;
    const rowAt = hop ? F.hop.rowAt : F.rowAt;
    const rowStep = hop ? F.hop.rowStep : F.rowStep;
    const barAt = hop ? F.hop.rowAt + 260 : F.barAt;
    this.root.setAttribute("data-flying", "");

    // the camera: pitch about the station, bring it to the focus point, come closer
    const plane = this.plane;
    if (plane && !plane.style.transform) plane.style.transform = this.pose(target, false);
    this.to(plane, { transform: this.pose(target, true) }, { duration: cam });
    for (const bb of all(this.root, ".dm-bb")) this.to(bb, { transform: this.upright(true) }, { duration: cam });
    for (const q of all(this.root, ".dm-q")) this.to(q, { opacity: 0 }, { duration: F.labelsOut, easing: "linear" });

    // the place answers: it lifts off the sheet, its shadow stays down, a ring draws round its foot
    for (const other of all(this.root, ".dm-coin")) {
      if (other !== coin && other.style.transform) this.to(other, { transform: this.lifted(false) }, { duration: F.hop.sink, easing: F.easeRise });
    }
    this.to(coin, { transform: this.lifted(true) }, { delay: riseAt, duration: rise, easing: F.easeRise });
    const visible = ring !== null && ring.style.opacity !== "" && ring.style.opacity !== "0";
    if (visible) {
      this.to(ring, { opacity: 0 }, { duration: 120, easing: "linear" });
      this.to(shadow, { opacity: 0 }, { duration: 120, easing: "linear" });
    }
    const draw = () => {
      if (token !== this.token) return;
      this.placeFoot(target);
      const left = Math.max(0, riseAt - (visible ? 130 : 0));
      if (ring) {
        ring.style.opacity = "0";
        ring.style.strokeDashoffset = "1";
        this.running.push(
          ring.animate(
            [
              { strokeDashoffset: 1, opacity: 1 },
              { strokeDashoffset: 0, opacity: 1 },
            ],
            { delay: left, duration: rise, easing: F.easeRise, fill: "forwards" },
          ),
        );
      }
      if (shadow) {
        shadow.style.opacity = "0";
        this.running.push(shadow.animate([{ opacity: 0 }, { opacity: 0.2 }], { delay: left, duration: rise, easing: F.easeRise, fill: "forwards" }));
      }
    };
    if (visible) this.timer = window.setTimeout(draw, 130);
    else draw();

    // the card arrives after the landing (it is already there on a hop); its rows rise in order
    if (card) {
      card.style.visibility = "";
      const shown: Keyframe = opts.sheet ? { transform: "translateY(0%)" } : { opacity: 1, transform: "translateX(0px)" };
      if (!hop) {
        if (opts.sheet) card.style.transform = "translateY(100%)";
        else {
          card.style.opacity = "0";
          card.style.transform = "translateX(-26px)";
        }
        this.to(card, shown, { delay: cardAt, duration: opts.sheet ? F.card + 60 : F.card });
      } else if (card.style.opacity !== "" || card.style.transform !== "") {
        this.to(card, shown, { duration: 240 });
      }
      all(card, ".dm-fi").forEach((row, i) => {
        row.style.opacity = "0";
        row.style.transform = "translateY(9px)";
        this.to(row, { opacity: 1, transform: "translateY(0px)" }, { delay: rowAt + i * rowStep, duration: hop ? F.hop.row : F.row, easing: E_OUT });
      });
      const bar = card.querySelector<HTMLElement>(".dm-th");
      if (bar) {
        bar.style.transform = "scaleX(0)";
        this.to(bar, { transform: "scaleX(1)" }, { delay: barAt, duration: F.bar });
      }
      if (leader && !opts.sheet) {
        leader.style.opacity = "0";
        this.placeLeader(target, card);
        this.running.push(
          leader.animate(
            [
              { opacity: 1, transform: "scaleX(0)" },
              { opacity: 1, transform: "scaleX(1)" },
            ],
            { delay: hop ? cam - 260 : cardAt + 80, duration: 340, easing: F.ease, fill: "forwards" },
          ),
        );
      }
    }
    this.to(this.back, { opacity: 1 }, { delay: cardAt, duration: 240, easing: "linear" });

    if (!(await this.landed(token))) return false;
    this.commit(card);
    this.stop();
    this.root.removeAttribute("data-flying");
    return true;
  }

  /**
   * station-return (1.06 s): the card leaves, the station sits back down, the camera returns to exactly the overview.
   * Resolves true when the overview is back, false when a newer press turned the camera first.
   */
  async release(card: HTMLElement | null, opts: FlightOptions): Promise<boolean> {
    const token = ++this.token;
    const from = this.target;
    this.freeze(card);
    this.stop();
    this.target = null;
    if (from === null || opts.instant) {
      this.commit(card);
      this.root.removeAttribute("data-flying");
      return true;
    }
    this.root.setAttribute("data-flying", "");
    const F = FLIGHT;
    const o = F.out;
    if (opts.sheet) this.to(card, { transform: "translateY(100%)" }, { duration: o.sheet, easing: F.easeIn });
    else this.to(card, { opacity: 0, transform: "translateX(-14px)" }, { duration: o.card, easing: "ease-in" });
    this.to(this.leader, { opacity: 0 }, { duration: 120, easing: "linear" });
    this.to(this.back, { opacity: 0 }, { duration: 120, easing: "linear" });
    for (const coin of all(this.root, ".dm-coin")) {
      if (coin.style.transform) this.to(coin, { transform: this.lifted(false) }, { duration: o.sink, easing: F.easeRise });
    }
    this.to(this.ring, { opacity: 0 }, { duration: o.sink, easing: "linear" });
    this.to(this.shadow, { opacity: 0 }, { duration: o.sink, easing: "linear" });
    this.to(this.plane, { transform: this.pose(from, false) }, { delay: o.camAt, duration: o.cam, easing: F.easeBack });
    for (const bb of all(this.root, ".dm-bb")) this.to(bb, { transform: this.upright(false) }, { delay: o.camAt, duration: o.cam, easing: F.easeBack });
    for (const q of all(this.root, ".dm-q")) this.to(q, { opacity: 1 }, { delay: o.labelsAt, duration: o.labels, easing: "linear" });
    if (!(await this.landed(token))) return false;
    if (card) card.style.visibility = "hidden"; // until React takes it away, a moment later
    this.commit(card);
    this.stop();
    this.root.removeAttribute("data-flying");
    return true;
  }

  /** Drop everything at once (the sheet was resized, redrawn, or is going away). */
  reset() {
    this.token += 1;
    this.stop();
    this.target = null;
    this.commit(null);
    this.root.removeAttribute("data-flying");
  }
}
