"use client";
// GainPreview (spec `gain-preview`, playbook 3.7): the job's match ring shows what a learning step would add. Hover shows it with
// a mouse; a tap (phone, pen) or the keyboard (Enter, Space) toggles it, since hover does not exist there. The preview: an
// accent dotted next leg and an open tick at the projected value, and a caption that rolls to the projected number. The
// ring's own number stays the real match.
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";

import { Ring } from "./ring";
import { Roll } from "./roll";

export function GainPreview({
  match,
  projected,
  size = 96,
  on,
  onToggle,
  nowLabel = "تطابقك الآن",
  afterLabel = "بعد خطوة التعلّم",
  testId = "gain-preview",
  className,
}: {
  match: number;
  projected: number;
  size?: number;
  /** Controlled pinned state (what a tap or Enter toggles, and what aria-pressed reports). Hover adds a transient
   * preview on top of it either way. Without it, the component keeps its own pinned state. */
  on?: boolean;
  /** Called when the pinned state is toggled (tap, pen, keyboard). Hover never calls it. */
  onToggle?: (on: boolean) => void;
  nowLabel?: string;
  afterLabel?: string;
  testId?: string;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const [toggled, setToggled] = useState(false);
  const lastPointer = useRef<string | null>(null);
  const pinned = on ?? toggled;
  const shown = pinned || hover;

  const toggle = () => {
    const next = !pinned;
    if (on === undefined) setToggled(next);
    onToggle?.(next);
  };

  return (
    <button
      type="button"
      // pressed reflects a real toggle (tap, keyboard), never a mere hover
      aria-pressed={pinned}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onClick={() => {
        const pointer = lastPointer.current;
        lastPointer.current = null;
        if (pointer === "mouse") return; // a mouse already sees the preview on hover; a click must not hide it again
        toggle();
      }}
      data-testid={testId}
      data-value={shown ? projected : match}
      className={cn("inline-flex items-center gap-4 rounded-xl p-2 text-start", className)}
    >
      <Ring value={match} preview={shown ? projected : undefined} size={size} />
      <span className="flex flex-col text-fg">
        <Roll id={shown ? "after" : "now"}>
          <span className="text-sm text-fg-2">{shown ? afterLabel : nowLabel}</span>
        </Roll>
        <Roll id={shown ? projected : match}>
          <span dir="ltr" className={cn("text-2xl font-bold tabular-nums", shown ? "text-accent-fg" : "text-fg")}>
            {formatPercent(shown ? projected : match)}
          </span>
        </Roll>
      </span>
    </button>
  );
}
