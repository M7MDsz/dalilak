"use client";
// SkillTag (playbook block 18): a found skill pops out of its sentence (where="sentence"), and ~350-450 ms later the same
// tag is rendered in the tray (where="tray") with the same layoutId, so it flies there on spring.gentle.
// Both renders must sit inside one <SkillTagGroup>, and must not be mounted at the same time.
import { LayoutGroup, motion } from "motion/react";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { popIn, spring } from "@/lib/motion";

/** Namespaces the tags' layoutIds (two CV shows on one page never cross). */
export function SkillTagGroup({ id, children }: { id?: string; children: ReactNode }) {
  const auto = useId();
  return <LayoutGroup id={id ?? auto}>{children}</LayoutGroup>;
}

/**
 * The tag looks the same in both places (an outlined pill), so the flight only translates and nothing stretches.
 * Render it right after its sentence with where="sentence": it sits in a zero-width anchor at the sentence's end, so the
 * paragraph never reflows, and it never covers the sentence that proves it:
 * - placement="end" (default): in the line, just past the end of the sentence. Right when the sentence ends its line, as
 *   every evidence line of a CV does (the sample CV is one sentence per line, PRODUCT-SPEC 6.2).
 * - placement="above": lifted just above the end of the sentence, for running text where other words follow it.
 * `children` go after the name (star pips). `restored`: a saved result renders in the tray without a flight.
 */
export function SkillTag({
  id,
  name,
  where,
  placement = "end",
  restored = false,
  children,
  className,
}: {
  id: string;
  name: ReactNode;
  where: "sentence" | "tray";
  placement?: "end" | "above";
  restored?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const tag = (
    <motion.span
      layoutId={restored ? undefined : `cv-tag-${id}`}
      data-skill={id}
      data-where={where}
      variants={popIn}
      initial={where === "sentence" && !restored ? "hidden" : false}
      animate="show"
      transition={{ layout: spring.gentle }}
      style={{ borderRadius: 999 }}
      className={cn(
        "inline-flex items-center gap-1.5 border-[1.5px] border-fg bg-surface px-3 py-0.5 align-middle text-sm leading-6 font-semibold whitespace-nowrap text-fg",
        where === "tray" ? "relative" : placement === "above" ? "absolute start-0 bottom-full z-10 mb-1" : "absolute start-2 top-1/2 z-10 -translate-y-1/2",
        className,
      )}
    >
      <motion.span layout="position" className="inline-flex items-center gap-1.5">
        {name}
        {children}
      </motion.span>
    </motion.span>
  );
  if (where === "tray") return tag;
  return (
    <span aria-hidden className="relative inline-block h-[1.2em] w-0 align-[-0.2em]">
      {tag}
    </span>
  );
}
