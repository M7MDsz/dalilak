import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** The empty-state drawing: three contour lines, a dotted trail climbing across them, and the trailhead: an open ring with
 *  the waypoint in its opening (you start here). Drawn in the surface's own tokens. */
export function TrailheadArt({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden className={cn("h-28 w-48", className)} fill="none" viewBox="0 0 192 112">
      <g strokeLinecap="round">
        <path className="stroke-contour-line" d="M4 100c26-6 44-22 76-24s58 16 108 8" strokeWidth={1.25} />
        <path className="stroke-contour-line-2" d="M12 84c24-10 40-28 70-30s50 14 98 6" strokeWidth={1.5} />
        <path className="stroke-contour-line" d="M26 66c20-10 34-26 60-28s42 10 86 4" strokeWidth={1.25} />
        <path className="stroke-contour-line" d="M44 48c16-9 28-20 46-21s32 7 66 3" strokeWidth={1.25} />
        <path className="stroke-contour-line" d="M64 31c12-6 20-12 32-12s22 5 44 2" strokeWidth={1.25} />
      </g>
      {/* the way ahead: a dotted trail from the trailhead up to the flag */}
      <path className="stroke-fg-3" d="M140 83C128 77 119 72 112 66S97 50 92 40 87 27 88 21" strokeDasharray="0.1 6.5" strokeLinecap="round" strokeWidth={2.5} />
      <path className="stroke-fg-2" d="M88 20V3l13 4.5L88 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      {/* the trailhead: a ring that opens once toward the trail, with the accent waypoint in the opening */}
      <path className="stroke-fg" d="M149.77 87.6A9 9 0 1 1 144.6 92.77" strokeLinecap="round" strokeWidth={2.25} />
      <circle className="fill-accent" cx={146.64} cy={89.64} r={3} />
    </svg>
  );
}

export interface EmptyStateProps {
  readonly title: ReactNode;
  readonly body?: ReactNode;
  /** One action, usually a Button (primary only if it is the screen's next step). */
  readonly action?: ReactNode;
  /** Replace the trailhead drawing (another drawn piece in the same language, never a stock illustration). */
  readonly art?: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/** EmptyState: calm, drawn, one action. Never an apology, never a big grey icon. */
export function EmptyState({ title, body, action, art, className, testId }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)} data-testid={testId}>
      {art ?? <TrailheadArt className="mb-1" />}
      <h3 className="text-h3 text-fg">{title}</h3>
      {body ? <p className="max-w-sm text-small text-fg-2">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
