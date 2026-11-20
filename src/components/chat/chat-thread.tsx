"use client";
// ChatThread (playbook block 21): the transcript. role="log". It follows the newest message only while the reader is
// pinned to the bottom (within 48 px), never yanks the scroll while they read back, and keeps the last answer in view
// when the composer grows (the scroller shrinks: if pinned, it stays at the end). When the reader has scrolled up and
// something new arrives, a small round button offers the way back down.
// New content from «دليلك»: the thread glides to the end (480 ms, eased in and out) while the answer comes into focus.
// The user's own message, a first paint and a scroller squeezed by the composer snap instead. Only the reader's own gesture (wheel, touch, keys,
// the scrollbar) unpins it; reaching the end again pins it. The scroller has `layoutScroll`, so a chip that travels in
// from outside (QuickReplies) measures correctly.
import { AnimatePresence, motion } from "motion/react";
import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { IconArrowDown } from "@/components/icons";
import { useInstant } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { popIn } from "@/lib/motion";

import { UserMessage } from "./user-message";

const PIN_PX = 48;
const GLIDE_MS = 480;

export interface ChatThreadProps {
  /** The messages, oldest first (AdvisorMessage, UserMessage, ChatError …), each with a stable key. */
  readonly children: ReactNode;
  /** The thread's accessible name. Default «المحادثة مع دليلك». */
  readonly label?: string;
  /** A reply is on its way (aria-busy). */
  readonly busy?: boolean;
  readonly className?: string;
  /** Classes of the inner column (padding, gap). Default `gap-5 px-4 py-5`. */
  readonly contentClassName?: string;
  /** data-testid (advisor-thread, welcome-thread). */
  readonly testId?: string;
  /** Something at the very top that scrolls with the thread (a date line, the mode line). */
  readonly header?: ReactNode;
}

/** The scrolling transcript of «دليلك» and the user. Give it `min-h-0 flex-1` room inside a flex column. */
export function ChatThread({ children, label = "المحادثة مع دليلك", busy = false, className, contentClassName, testId, header }: ChatThreadProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [away, setAway] = useState(false); // scrolled up while something new arrived
  const items = Children.toArray(children);
  const count = items.length;
  const last = items[items.length - 1];
  const lastKey = isValidElement(last) ? String(last.key) : String(count);
  const lastIsUser = isValidElement(last) && last.type === UserMessage;
  const userLast = useRef(lastIsUser);
  userLast.current = lastIsUser;

  const instant = useInstant();
  const raf = useRef(0);
  const intent = useRef(-1e9); // when the reader last made a scroll gesture
  const mounted = useRef(false);

  /** Straight to the end: on first paint, and when the scroller itself resizes (the composer growing). */
  const snap = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    el.scrollTop = el.scrollHeight;
  }, []);

  /** Glide to the end when «دليلك»'s content arrives: 480 ms, eased in and out, toward the live end (it may still grow). */
  const glide = useCallback(() => {
    const el = scroller.current;
    if (!el || raf.current) return;
    const from = el.scrollTop;
    const t0 = performance.now();
    const step = (now: number) => {
      if (!pinned.current) {
        raf.current = 0;
        return;
      }
      const target = el.scrollHeight - el.clientHeight;
      const t = Math.min(1, (now - t0) / GLIDE_MS);
      el.scrollTop = from + (target - from) * (0.5 - Math.cos(Math.PI * t) / 2);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        el.scrollTop = target;
        raf.current = 0;
      }
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // every render (a message added or changed): follow if the reader is at the end. A layout effect, so a bubble that
  // travels in from a chip is measured against the thread as it will stand.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    if (!mounted.current || instant) {
      mounted.current = true;
      snap();
      return;
    }
    if (el.scrollHeight - el.clientHeight - el.scrollTop <= 1) return;
    // the user's own message snaps (it pops out of the composer right under it; a travelling chip lands where it will
    // stay); «دليلك»'s content glides
    if (lastIsUser) snap();
    else glide();
  });

  // something new arrived while the reader was up the thread: offer the way down
  const seen = useRef(lastKey);
  useEffect(() => {
    if (seen.current === lastKey) return;
    seen.current = lastKey;
    if (!pinned.current) setAway(true);
  }, [lastKey]);

  // sizes that change after the commit: the scroller shrinking under a growing composer (snap, so the last answer stays in
  // view frame by frame), or the content growing (glide)
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const observer = new ResizeObserver((entries) => {
      if (!pinned.current) return;
      if (entries.some((e) => e.target === el) || instant || userLast.current) snap();
      else glide();
    });
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [glide, snap, instant]);

  const markIntent = () => {
    intent.current = performance.now();
  };

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      <motion.div
        aria-busy={busy || undefined}
        aria-label={label}
        aria-live="polite"
        aria-relevant="additions"
        // `relative`: the scroller is the containing block of the messages' absolute pieces (every message's sr-only
        // name or status). Without it they were positioned against an ancestor outside the scroller: not clipped by it,
        // not moved by its scroll, each one sitting up to the thread's scroll below its message, which made the whole
        // page taller than the window (1073-1459 px at 900) and let it scroll away under the conversation.
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-testid={testId}
        layoutScroll
        onKeyDown={(event) => {
          if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) markIntent();
        }}
        onPointerDown={markIntent}
        onScroll={(event) => {
          const el = event.currentTarget;
          const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < PIN_PX;
          if (atEnd) {
            pinned.current = true;
            if (away) setAway(false);
            return;
          }
          // only the reader's own gesture unpins: the glide and layout changes scroll too
          if (performance.now() - intent.current < 400) {
            pinned.current = false;
            cancelAnimationFrame(raf.current);
            raf.current = 0;
          }
        }}
        onTouchMove={markIntent}
        onWheel={(event) => {
          markIntent();
          if (event.deltaY < 0) {
            pinned.current = false;
            cancelAnimationFrame(raf.current);
            raf.current = 0;
          }
        }}
        ref={scroller}
        role="log"
        tabIndex={0}
      >
        <div className={cn("flex flex-col gap-5 px-4 py-5", contentClassName)} ref={content}>
          {header}
          {items.map((item, i) => (
            // finished messages far up the thread skip rendering work until they are scrolled to
            <div className={i < count - 4 ? "[contain-intrinsic-size:auto_6rem] [content-visibility:auto]" : undefined} key={isValidElement(item) ? item.key : i}>
              {item}
            </div>
          ))}
        </div>
      </motion.div>
      <AnimatePresence>
        {away ? (
          <motion.button
            animate="show"
            aria-label="انتقل إلى آخر الرسائل"
            className="absolute inset-x-0 bottom-3 mx-auto grid size-9 place-items-center rounded-full border border-border-strong bg-surface text-fg shadow-float"
            exit="exit"
            initial="hidden"
            key="down"
            onClick={() => {
              pinned.current = true;
              setAway(false);
              if (instant) snap();
              else glide();
            }}
            type="button"
            variants={popIn}
          >
            <IconArrowDown size={18} waypoint="off" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
