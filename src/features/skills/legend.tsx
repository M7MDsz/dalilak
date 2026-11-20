// Owner: skills. The legend (spec 3.5): «مكتسبة» · «متاحة» · «مقفلة» · «في مسارك», each with the mark it explains,
// drawn the way the nodes draw it (shape first, colour second).
import type { ReactNode } from "react";

import { IconLock, IconTarget } from "@/components/icons";
import { cn } from "@/components/ui";

import { COPY, STATE_LABEL } from "./copy";

function Disk({ kind }: { kind: "earned" | "available" | "locked" }): ReactNode {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border-2",
        kind === "earned" && "border-fg bg-solid",
        kind === "available" && "border-border-strong bg-surface",
        kind === "locked" && "border-dashed border-border-strong bg-surface-2 text-fg-2",
      )}
    >
      {kind === "locked" ? <IconLock size={14} strokeWidth={2.5} waypoint="off" /> : null}
    </span>
  );
}

export function Legend({ className }: { readonly className?: string }): ReactNode {
  const item = "inline-flex items-center gap-2 text-small text-fg-2";
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      <li className={item}>
        <Disk kind="earned" />
        {STATE_LABEL.earned}
      </li>
      <li className={item}>
        <Disk kind="available" />
        {STATE_LABEL.available}
      </li>
      <li className={item}>
        <Disk kind="locked" />
        {STATE_LABEL.locked}
      </li>
      <li className={item}>
        <span aria-hidden className="grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] border-fg bg-surface text-fg">
          <IconTarget size={18} strokeWidth={1.9} waypoint="muted" />
        </span>
        {COPY.inPath}
      </li>
    </ul>
  );
}
