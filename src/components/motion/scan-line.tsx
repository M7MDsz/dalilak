"use client";
// ScanLine (CV analysis, `scan-line`): a full-size layer slides down the document; its bottom edge is a 1.5 px line in the
// surface's ink (where the reading is now; the accent is kept for your position and next action). Transform only, linear,
// then the line fades. Put it inside the `relative` document box.
import { motion } from "motion/react";

/** `playing` starts the pass (1.2 s by default); turning it off puts the line back at the top, hidden. */
export function ScanLine({ playing, duration = 1.2, onDone }: { playing: boolean; duration?: number; onDone?: () => void }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ y: "-100%", opacity: 0 }}
        animate={playing ? { y: "0%", opacity: [1, 1, 0] } : { y: "-100%", opacity: 0 }}
        transition={playing ? { y: { duration, ease: "linear" }, opacity: { duration: duration + 0.25, times: [0, duration / (duration + 0.25), 1] } } : { duration: 0 }}
        onAnimationComplete={() => {
          if (playing) onDone?.();
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-fg" />
      </motion.div>
    </div>
  );
}
