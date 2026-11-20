import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge taught Dalilak's theme. Without this, `cn("text-h1", "text-fg")` keeps only `text-fg`: the merge does not
 * know `h1` is a size, takes it for a colour and drops it (the same for text-small, text-caption, rounded-card, shadow-float).
 * The kit uses this `cn`. src/lib/cn.ts (the lead's) should use the same config: see DESIGN.md 9 and the report.
 */
export const dalilakMergeConfig = {
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "title", "body", "small", "caption"],
      radius: ["tag", "control", "card", "sheet"],
      shadow: ["float"],
      spacing: ["gutter", "section", "card"],
      ease: ["pop"],
      animate: ["run", "rise", "focus-in", "pop-in", "breathe", "pulse-ring"],
    },
  },
};

const merge = extendTailwindMerge(dalilakMergeConfig);

/** Joins class names and resolves Tailwind conflicts (the last one wins), knowing Dalilak's type scale and radii. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
