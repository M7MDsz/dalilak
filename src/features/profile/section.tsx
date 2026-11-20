// Owner: profile. One section of the profile: a white sheet with its heading (h2) at the inline-start and an optional
// line at the inline-end («6 من 12»). Every section of the page is drawn the same way, so the page reads as one ledger.
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/components/ui";

export function Section({
  title,
  meta,
  children,
  className,
  headingId,
  ...rest
}: Omit<ComponentProps<"section">, "title"> & {
  readonly title: string;
  readonly meta?: ReactNode;
  readonly headingId: string;
}): ReactNode {
  return (
    <section aria-labelledby={headingId} className={cn("flex min-w-0 flex-col gap-5 rounded-card border border-border bg-surface p-card @min-[640px]/content:p-6", className)} {...rest}>
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 text-fg" id={headingId}>
          {title}
        </h2>
        {meta}
      </header>
      {children}
    </section>
  );
}
