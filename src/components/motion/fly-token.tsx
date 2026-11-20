"use client";
// FlyToken (playbook block 24): a token is consumed by its target (XP into the user chip, a star into its skill).
// Two rects are measured at the moment of the event; one fixed element flies between them in viewport pixels (physical
// on purpose), centre to centre, 600 ms ease-in-out on a gentle arc that always bows UPWARD (a reward never dips),
// shrinking to 0.6 and fading at the very end; then the target reacts. The source token is hidden from the moment it
// leaves (it is consumed by its target). Never across a route change. One flight at a time; merged gains fly once with
// the sum.
import { arc, motion } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { dur, ease } from "@/lib/motion";

import { useInstant } from "./provider";

/** `x`, `y`: the CENTRE of the source in viewport px; `dx`, `dy`: the travel to the centre of the target. */
export type Flight = { id: number; x: number; y: number; dx: number; dy: number; node: ReactNode };

/** Measure a flight from the centre of `from` to the centre of `to`. Call it in the event handler, not during render. */
export function flightBetween(from: Element, to: Element, node: ReactNode, id: number): Flight {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  return { id, node, x: ax, y: ay, dx: b.left + b.width / 2 - ax, dy: b.top + b.height / 2 - ay };
}

// Motion's arc bows to one side of the travel vector; pick the side that is "up" on screen for each direction.
const BOW = 0.22;
const bowUpGoingRight = arc({ strength: BOW, direction: "cw" });
const bowUpGoingLeft = arc({ strength: BOW, direction: "ccw" });

/**
 * Renders one flight in a portal on <body> (fixed positioning must not be caught by a transformed page). The node is
 * centred on the flight's point, so a token of any size lands centred on the target.
 * `onArrive` fires when it lands; reduced motion and still frames land at once without travelling.
 */
export function FlyToken({ flight, onArrive }: { flight: Flight; onArrive: () => void }) {
  const instant = useInstant();
  const arrive = useEffectEvent(onArrive);
  useEffect(() => {
    if (instant) arrive();
  }, [instant]);
  if (instant || typeof document === "undefined") return null;
  return createPortal(
    <motion.span
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-fly block"
      initial={{ x: flight.x, y: flight.y, scale: 1, opacity: 1 }}
      animate={{ x: flight.x + flight.dx, y: flight.y + flight.dy, scale: 0.6, opacity: [1, 1, 0] }}
      transition={{
        duration: dur.fly,
        ease: ease.inOut,
        path: flight.dx >= 0 ? bowUpGoingRight : bowUpGoingLeft,
        opacity: { duration: dur.fly, times: [0, 0.82, 1] },
      }}
      onAnimationComplete={() => arrive()}
    >
      <span className="block -translate-x-1/2 -translate-y-1/2">{flight.node}</span>
    </motion.span>,
    document.body,
  );
}

/** What happens to the source element: "consume" (default) hidden from launch and left hidden, since the token now lives
 * in its target (the XP token of a toast); "hide" hidden while it flies and shown again when it lands (a demo that
 * replays); "keep" left visible (a copy flies). visibility only, so nothing around it reflows. */
export type FlySource = "hide" | "consume" | "keep";

/**
 * A small manager: `fly(fromEl, toEl, node, source?)` launches a flight and resolves when it lands; render `layer` once.
 * const { fly, layer } = useFlights();  …  await fly(tokenEl, chipEl, <XpChip/>); setTotal(t => t + 200);
 * `source` (FlySource, default "consume") says what happens to `fromEl`.
 */
export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const next = useRef(1);
  const landings = useRef(new Map<number, () => void>());
  const fly = useCallback((from: Element | null, to: Element | null, node: ReactNode, source: FlySource = "consume") => {
    if (!from || !to) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const id = next.current++;
      const flight = flightBetween(from, to, node, id);
      const el = from instanceof HTMLElement || from instanceof SVGElement ? from : null;
      const before = el?.style.visibility ?? "";
      if (el && source !== "keep") el.style.visibility = "hidden";
      const done = () => {
        if (el && source === "hide") el.style.visibility = before;
        resolve();
      };
      landings.current.set(id, done);
      setFlights((list) => [...list, flight]);
    });
  }, []);
  const land = useCallback((id: number) => {
    landings.current.get(id)?.();
    landings.current.delete(id);
    setFlights((list) => list.filter((f) => f.id !== id));
  }, []);
  const layer = (
    <>
      {flights.map((f) => (
        <FlyToken key={f.id} flight={f} onArrive={() => land(f.id)} />
      ))}
    </>
  );
  return { fly, layer };
}
