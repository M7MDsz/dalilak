"use client";
// DaleelGlyph: «دليل»'s living mark (playbook block 9). The same idea as IconAdvisor: an open compass ring with the
// waypoint in its opening, and a needle that points at the waypoint ("«دليل» points you to your next step").
// Only the needle moves (one moving part). Its behaviour is the state:
//   idle       still, pointing at the waypoint
//   listening  a small attentive turn (the user is typing), held
//   thinking   the needle seeks: it swings and settles, a 2.4 s loop in step with the status shimmer
//   working    a tool is running (opening a page, filling a form): a steady sweep, one turn per 2.4 s
//   done       it settles on its bearing with one small overshoot and becomes the still glyph
// The loop is one of the five the playbook allows (1.7). Reduced motion and still frames: the needle rests, always.
// Colours: ink from currentColor (so it follows the surface), the waypoint from the accent token.
import { animate, motion, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useEffectEvent, useRef } from "react";

import { useInstant } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { dur, ease, spring } from "@/lib/motion";

export type DaleelState = "idle" | "listening" | "thinking" | "working" | "done";

/** The needle's bearing at rest: toward the waypoint in the ring's opening (north-east, as in IconAdvisor). */
const REST = 45;
/** The seek: a disturbed needle swinging and settling, as offsets from the bearing, over one 2.4 s beat. */
const SEEK = [0, -64, 46, -24, 11, -4, 0, 0];
const SEEK_TIMES = [0, 0.15, 0.33, 0.49, 0.62, 0.73, 0.84, 1];
const LISTEN_TURN = -26;

/** The rest angle (45 + k * 360) nearest to `angle`; with `ahead`, the first one at least `ahead` degrees forward. */
function restFrom(angle: number, ahead?: number): number {
  if (ahead === undefined) return REST + Math.round((angle - REST) / 360) * 360;
  return REST + Math.ceil((angle + ahead - REST) / 360) * 360;
}

// The ring is the IconAdvisor ring (open at the north-east); the waypoint sits in the opening.
const RING = "M14 3.5A8.75 8.75 0 1 0 20.5 10";
// The needle, drawn pointing up about the centre (12, 12) and turned by `rotate`. It is symmetric, so it turns about
// its own middle. The pointing half is solid; the tail half is an outline.
const NEEDLE_TIP = "M12 7.75 13.6 12h-3.2z";
const NEEDLE_TAIL = "M13.6 12 12 16.25 10.4 12";

export interface DaleelGlyphProps {
  /** What «دليل» is doing. Default `idle`. */
  readonly state?: DaleelState;
  /** Outer size in px, 16 to 48. Default 24. With `framed` this is the disc's size. */
  readonly size?: number;
  /** In an ink disc (beside a message, the panel header, the launcher). It flips on the stage by itself. */
  readonly framed?: boolean;
  /** Shared-layout id, so the glyph can travel (launcher to panel header, field to field in the apply flow). */
  readonly layoutId?: string;
  readonly className?: string;
  /** Accessible name. Without it the glyph is decorative (it always sits next to words that say what is happening). */
  readonly title?: string;
  /** Called when a `done` settle has come to rest. */
  readonly onSettled?: () => void;
}

/** «دليل»'s living compass. Reads at 20 px beside a line of text; 16 to 48 px. */
export function DaleelGlyph({ state = "idle", size = 24, framed = false, layoutId, className, title, onSettled }: DaleelGlyphProps) {
  const instant = useInstant();
  const rotate = useMotionValue(REST);
  const previous = useRef<DaleelState>(state);
  const settled = useEffectEvent(() => onSettled?.());

  useEffect(() => {
    if (instant) {
      rotate.jump(restFrom(rotate.get()));
      if (state === "done") settled();
      return;
    }
    let alive = true;
    let controls: AnimationPlaybackControls | undefined;
    const now = rotate.get();
    switch (state) {
      case "idle":
        controls = animate(rotate, restFrom(now), spring.gentle);
        break;
      case "listening":
        controls = animate(rotate, restFrom(now) + LISTEN_TURN, spring.pop);
        break;
      case "thinking": {
        // ease onto the bearing from wherever the needle is, then seek
        const base = restFrom(now);
        controls = animate(rotate, base, {
          duration: dur.fast,
          ease: ease.out,
          onComplete: () => {
            if (!alive) return;
            controls = animate(
              rotate,
              SEEK.map((o) => base + o),
              { duration: dur.shimmer, times: SEEK_TIMES, ease: "easeInOut", repeat: Infinity },
            );
          },
        });
        break;
      }
      case "working":
        // a steady sweep from where the needle is: one turn per beat, forever (each loop ends where it began, seen round)
        controls = animate(rotate, [now, now + 360], { duration: dur.shimmer, ease: "linear", repeat: Infinity });
        break;
      case "done": {
        // settle on the bearing with one small overshoot. A sweeping needle carries on to the bearing ahead of it (never
        // backwards), and its speed goes into the settle.
        const sweeping = previous.current === "working";
        const target = sweeping ? restFrom(now, 40) : restFrom(now);
        if (Math.abs(target - now) < 0.5) {
          rotate.jump(target);
          settled();
          break;
        }
        controls = animate(rotate, target, { ...spring.pop, onComplete: () => alive && settled() });
        break;
      }
    }
    return () => {
      alive = false;
      controls?.stop();
      previous.current = state;
    };
  }, [state, instant, rotate]);

  const glyph = framed ? Math.round(size * 0.625) : size;
  const strokeWidth = glyph <= 28 ? 2 : 1.75;

  return (
    <motion.span
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={cn("relative inline-grid shrink-0 place-items-center", framed && "rounded-full bg-solid text-on-solid", className)}
      data-glyph="daleel"
      data-state={state}
      layoutId={layoutId}
      role={title === undefined ? undefined : "img"}
      style={{ width: size, height: size }}
      transition={layoutId ? { layout: spring.gentle } : undefined}
    >
      <span className="relative block" style={{ width: glyph, height: glyph }}>
        <svg aria-hidden className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24">
          <path d={RING} />
          <circle className="fill-accent" cx="18" cy="6" r="1.75" stroke="none" />
        </svg>
        <motion.span className="absolute inset-0 block" style={{ rotate }}>
          <svg aria-hidden className="block size-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24">
            <path d={NEEDLE_TIP} fill="currentColor" />
            <path d={NEEDLE_TAIL} />
          </svg>
        </motion.span>
      </span>
    </motion.span>
  );
}
