// Collapse (playbook block 32): a height that follows its content without measuring: a CSS grid row that goes from
// 0fr to 1fr (opens in 420 ms ease-out, closes in 260 ms ease-in), the content fading with it. CSS: `.collapse` in
// motion.css. Closed content is inert (not focusable, hidden from screen readers).
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Collapse({ open, children, className, testId }: { open: boolean; children: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cn("collapse-rows", className)} data-open={open ? "" : undefined} data-testid={testId} inert={!open}>
      <div className="min-h-0 overflow-clip">{children}</div>
    </div>
  );
}
