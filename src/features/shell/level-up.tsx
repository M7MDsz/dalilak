"use client";
// Owner: shell. The level-up of spec 3.15 and ARCHITECTURE 10 step 3. It is NOT a Sheet: a non-modal card at z-toast,
// with no backdrop and no focus trap, on the stage (a reward moment). It is never part of the toast stack and never
// sits over the page the presenter is pointing at (QA, 18 Nov: the old card under the toasts hid the CV results):
//   desktop: a compact row in the top bar, right beside the user chip on its inline-start side (where the XP coin has
//            just landed and the level number rolls), so it covers the next-step pill for a moment and nothing of the
//            page; beside the docked panel at 1280 px the bar is tighter, so the card drops its «متابعة» button there
//            (a press anywhere, on the card too, Esc or 4 s close it); with less room still it drops under the chip;
//   phone:   the same compact row, horizontally centred, pinned directly above the tab bar (spec 2.4), so the toasts
//            at the top and the level-up at the bottom never stack over the page.
// «مستوى جديد» · «المستوى 2» · «مستكشف» · «بقي 170 XP للمستوى 3» · «متابعة»; at level 7 «بلغت القمة: أسطورة».
// A gain that crosses two levels shows the final level only (pendingNews does that).
// It closes on «متابعة», on Esc, after 4 s, or on any pointer press outside it: a document listener in the CAPTURE phase
// that neither prevents nor stops the event, so the press also reaches its target (demo step 7 presses cv-go-path
// while it is open). Esc: the topmost layer only (ARCHITECTURE 13): an open dialog or sheet keeps its own Esc, and so
// does the advisor panel while focus is inside it; otherwise the level-up takes it (window capture phase, so it runs
// before any bubbling Esc handler) and calls preventDefault.
// `level-reveal`: the number lands with spring.cheer, the title rolls in from the previous level's title.
// Test ids: overlay-levelup (data-value = the new level), overlay-levelup-close.
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { LevelEmblem } from "@/components/emblems";
import { Roll, useInstant } from "@/components/motion";
import { Button, cn, Stage } from "@/components/ui";
import { getLevel } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { dur, ease, spring } from "@/lib/motion";
import { TID } from "@/lib/testids";
import type { LevelNumber } from "@/lib/types";

export interface LevelUpView {
  /** Increments per level-up, so a second one replays the reveal. */
  readonly id: number;
  readonly level: LevelNumber;
  readonly title: string;
  /** XP still needed for the next level; null at level 7. */
  readonly xpToNext: number | null;
  /** Desktop: beside the user chip in the top bar. Phone: above the tab bar. */
  readonly layout: "desktop" | "phone";
}

const TOP_LEVEL: LevelNumber = 7;
/** Space between the chip and the card, and the top bar's own inline padding the card stays inside. */
const GAP_PX = 12;
const BAR_EDGE_PX = 24;
/** The card's widest form; the least room beside the chip for the card with its button; the least room for the tight
 *  card without it (it still closes on a press anywhere, on itself too, on Esc and after 4 s). Under that it drops
 *  just under the chip. */
const MAX_WIDTH_REM = 24;
const MIN_ROOM_REM = 19;
const MIN_TIGHT_ROOM_REM = 14.5;

/** Where the card stands, in viewport px. `insetEnd` is measured from the viewport's inline-end edge. */
type Placement =
  | { readonly kind: "beside"; readonly centreY: number; readonly insetEnd: number; readonly maxWidth: number; readonly tight: boolean }
  | { readonly kind: "under"; readonly top: number; readonly insetEnd: number; readonly maxWidth: number }
  | { readonly kind: "bottom" };

function rootRem(): number {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/** Desktop: beside the user chip, inside the top bar (or just under the chip when the bar is too tight). */
function placementFor(layout: LevelUpView["layout"]): Placement {
  if (layout === "phone") return { kind: "bottom" };
  const rem = rootRem();
  const maxWidth = MAX_WIDTH_REM * rem;
  const chip = document.querySelector(`[data-testid="${TID.shell.userChip}"]`);
  if (!(chip instanceof HTMLElement)) {
    const shellTop = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-top")) || 4;
    return { kind: "under", top: shellTop * rem + GAP_PX, insetEnd: (window.innerWidth - maxWidth) / 2, maxWidth };
  }
  const rtl = getComputedStyle(document.documentElement).direction === "rtl";
  const c = chip.getBoundingClientRect();
  const bar = chip.closest("header")?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth };
  // the free run of the bar on the chip's inline-start side (to its right in RTL)
  const room = rtl ? bar.right - BAR_EDGE_PX - (c.right + GAP_PX) : c.left - GAP_PX - (bar.left + BAR_EDGE_PX);
  if (room >= MIN_TIGHT_ROOM_REM * rem) {
    return {
      kind: "beside",
      centreY: c.top + c.height / 2,
      insetEnd: rtl ? c.right + GAP_PX : window.innerWidth - c.left + GAP_PX,
      maxWidth: Math.min(maxWidth, room),
      tight: room < MIN_ROOM_REM * rem, // beside the docked panel at 1280: no room for the button
    };
  }
  // too tight beside it: just under the chip, flush with its outer (inline-end) edge
  const insetEnd = rtl ? c.left : window.innerWidth - c.right;
  return { kind: "under", top: c.bottom + 8, insetEnd, maxWidth: Math.min(maxWidth, window.innerWidth - insetEnd - BAR_EDGE_PX) };
}

/** The placement, measured before paint and kept in step with the bar (the advisor panel docking resizes it). */
function usePlacement(layout: LevelUpView["layout"]): Placement {
  const [placement, setPlacement] = useState<Placement>(() => placementFor(layout));
  useLayoutEffect(() => {
    const update = () => setPlacement(placementFor(layout));
    update();
    if (layout === "phone") return;
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    const chip = document.querySelector(`[data-testid="${TID.shell.userChip}"]`);
    const bar = chip?.closest("header");
    if (chip) observer.observe(chip);
    if (bar) observer.observe(bar);
    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [layout]);
  return placement;
}

function placementStyle(placement: Placement): CSSProperties | undefined {
  if (placement.kind === "beside") return { top: placement.centreY, insetInlineEnd: placement.insetEnd, maxWidth: placement.maxWidth, translate: "0 -50%" };
  if (placement.kind === "under") return { top: placement.top, insetInlineEnd: placement.insetEnd, maxWidth: placement.maxWidth };
  return undefined;
}

/** Is another layer above the level-up for Esc (an open Base UI dialog that is not the advisor panel)? */
function escBelongsElsewhere(target: EventTarget | null): boolean {
  const active = document.activeElement;
  if (active instanceof Element && active.closest('[data-testid="advisor-panel"]')) return true;
  if (target instanceof Element && target.closest('[data-testid="advisor-panel"]')) return true;
  const dialogs = document.querySelectorAll('[role="dialog"][data-open], [role="alertdialog"][data-open]');
  for (const dialog of dialogs) {
    if (dialog.closest('[data-testid="advisor-panel"]') || dialog.getAttribute("data-testid") === "advisor-panel") continue;
    if (dialog.hasAttribute("data-shell-levelup")) continue;
    return true;
  }
  return false;
}

export function LevelUpCard({ view, onClose }: { readonly view: LevelUpView; readonly onClose: () => void }): ReactNode {
  const instant = useInstant();
  const card = useRef<HTMLDivElement | null>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const placement = usePlacement(view.layout);

  // The title rolls in from the previous level's title, one beat after the card has arrived.
  const previousTitle = view.level > 1 ? getLevel((view.level - 1) as LevelNumber).title : view.title;
  const [titleShown, setTitleShown] = useState(instant ? view.title : previousTitle);
  useEffect(() => {
    if (instant) {
      setTitleShown(view.title);
      return;
    }
    const timer = window.setTimeout(() => setTitleShown(view.title), 380);
    return () => window.clearTimeout(timer);
  }, [instant, view.title]);

  useEffect(() => {
    const auto = window.setTimeout(() => close.current(), 4_000);
    const onPointer = (event: PointerEvent) => {
      if (card.current && event.target instanceof Node && card.current.contains(event.target)) return;
      close.current(); // no preventDefault, no stopPropagation: the press also reaches what was pressed
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (escBelongsElsewhere(event.target)) return;
      event.preventDefault();
      close.current();
    };
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(auto);
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [view.id]);

  const atTop = view.level >= TOP_LEVEL;
  const bottom = placement.kind === "bottom";
  const tight = placement.kind === "beside" && placement.tight;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-toast flex",
        bottom ? "inset-x-4 bottom-[calc(var(--shell-bottom,0px)+0.75rem)] justify-center" : "justify-end",
      )}
      style={placementStyle(placement)}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        aria-label="مستوى جديد"
        aria-modal="false"
        className={cn("pointer-events-auto min-w-0", bottom ? "w-full max-w-[24rem]" : "w-max max-w-full")}
        data-shell-levelup=""
        data-testid={TID.overlay.levelup}
        data-value={view.level}
        exit={{ opacity: 0, transition: { duration: dur.exit, ease: ease.in } }}
        initial={instant ? false : { opacity: 0, y: bottom ? 8 : -6 }}
        onClick={tight ? () => close.current() : undefined}
        ref={card}
        role="dialog"
        transition={{ duration: dur.fast, ease: ease.out }}
      >
        <Stage className={cn("flex items-center gap-3 rounded-[1.125rem] border border-border py-1 ps-2 shadow-float", tight ? "pe-4" : "pe-2")} contour="faint">
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className="grid size-12 shrink-0 place-items-center rounded-full border-[1.5px] border-fg text-fg"
            initial={instant ? false : { scale: 0.6, opacity: 0 }}
            transition={{ default: spring.cheer, opacity: { duration: dur.fast, ease: ease.out } }}
          >
            <LevelEmblem level={view.level} size={28} />
          </motion.span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p aria-live="polite" className="text-caption leading-tight font-semibold text-fg-2">
              مستوى جديد
            </p>
            <p className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-title text-fg">
              <span className="font-bold">
                المستوى{" "}
                <motion.bdi animate={{ scale: 1 }} className="inline-block tabular-nums" initial={instant ? false : { scale: 0.7 }} transition={spring.cheer}>
                  {view.level}
                </motion.bdi>
              </span>
              <span aria-hidden className="text-fg-3">
                ·
              </span>
              <span className="min-w-0 truncate font-semibold text-fg-2">
                {atTop ? `بلغت القمة: ${view.title}` : <Roll id={titleShown}>{titleShown}</Roll>}
              </span>
            </p>
            {!atTop && view.xpToNext !== null ? (
              <p className="text-caption leading-tight whitespace-nowrap text-fg-2">
                بقي <bdi dir="ltr">{formatNumber(view.xpToNext)} XP</bdi> للمستوى <bdi className="tabular-nums">{view.level + 1}</bdi>
              </p>
            ) : null}
          </div>
          {tight ? null : (
            <Button className="shrink-0" data-testid={TID.overlay.levelupClose} onClick={() => close.current()} size="sm" variant="secondary">
              متابعة
            </Button>
          )}
        </Stage>
      </motion.div>
    </div>
  );
}
