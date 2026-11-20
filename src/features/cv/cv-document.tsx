"use client";
// Owner: cv. The CV as a document on the stage (spec 3.6, 6.3): a white sheet (data-surface="paper") laid out like a résumé
// from the cleaned lines of 6.5 (the same list the analysis returns, so nothing re-flows): the name as its title, the
// lines before the first heading as quiet meta, then one row per section with its heading in a narrow column.
// `scan-line`: a line passes down the sheet while a pale veil lifts behind it, so the text inks in as it is read.
// `phrase-highlight`: each evidence sentence gets the marker stroke (Highlight). Found tags pop in the `overlay` layer,
// which sits above the sheet and is never clipped by it.
import { motion } from "motion/react";
import { memo, type ReactNode, type Ref } from "react";

import { Highlight, ScanLine } from "@/components/motion";
import { cn } from "@/components/ui";
import type { CvLine } from "@/lib/brain/cv";

import { Bidi } from "./bidi";

export type ScanState = "pending" | "running" | "done";

type Section = { readonly heading: number | null; readonly items: readonly number[] };
type Layout = {
  readonly title: number | null;
  readonly meta: readonly number[];
  readonly sections: readonly Section[];
  /** An English CV is laid out left to right (its headings on the left); each line still takes its own direction. */
  readonly dir: "rtl" | "ltr";
};

const FIRST_STRONG = /[A-Za-z\u0600-\u06FF]/u;

/** The direction most lines start in (by their first strong letter). */
function directionOf(lines: readonly CvLine[]): "rtl" | "ltr" {
  let ltr = 0;
  let rtl = 0;
  for (const line of lines) {
    const ch = FIRST_STRONG.exec(line.text)?.[0];
    if (ch === undefined) continue;
    if (/[A-Za-z]/.test(ch)) ltr++;
    else rtl++;
  }
  return ltr > rtl ? "ltr" : "rtl";
}

/** Title, meta lines, sections. Pure, so the document is memoised per CV. */
function layoutOf(lines: readonly CvLine[]): Layout {
  const first = lines.findIndex((l) => l.heading);
  const pre = first < 0 ? lines.length : first;
  let title: number | null = null;
  const meta: number[] = [];
  const loose: number[] = [];
  for (let i = 0; i < pre; i++) {
    const text = lines[i]?.text ?? "";
    if (i === 0 && text.length <= 40) title = i;
    else if (loose.length === 0 && meta.length < 3 && text.length <= 80) meta.push(i);
    else loose.push(i);
  }
  const sections: { heading: number | null; items: number[] }[] = [];
  if (loose.length > 0) sections.push({ heading: null, items: loose });
  for (let i = pre; i < lines.length; i++) {
    const current = sections[sections.length - 1];
    if (lines[i]?.heading) sections.push({ heading: i, items: [] });
    else if (current) current.items.push(i);
    else sections.push({ heading: null, items: [i] });
  }
  return { title, meta, sections, dir: directionOf(lines) };
}

export const CvDocument = memo(function CvDocument({
  lines,
  lit,
  scan,
  registerLine,
  wrapperRef,
  boxRef,
  boxClassName,
  overlay,
}: {
  readonly lines: readonly CvLine[];
  /** Lines whose marker is drawn. */
  readonly lit: ReadonlySet<number>;
  readonly scan: ScanState;
  /** Gets the text span of each line (for measuring where a sentence ends). */
  readonly registerLine: (index: number, el: HTMLSpanElement | null) => void;
  readonly wrapperRef: Ref<HTMLDivElement>;
  readonly boxRef: Ref<HTMLDivElement>;
  readonly boxClassName?: string;
  readonly overlay?: ReactNode;
}) {
  const layout = layoutOf(lines);
  const line = (i: number, className: string, list = false) => {
    const on = lit.has(i);
    return (
      <p
        className={cn(className, "transition-colors duration-500", on && "text-fg", list && "relative ps-4")}
        data-line={i}
        dir="auto"
        key={i}
      >
        {list ? <span aria-hidden className="absolute start-0.5 top-[0.78em] size-[5px] rounded-full bg-fg-3" /> : null}
        <Highlight on={on}>
          <span ref={(el) => registerLine(i, el)}>
            <Bidi text={lines[i]?.text ?? ""} />
          </span>
        </Highlight>
      </p>
    );
  };

  return (
    <div className="relative rounded-card border border-border bg-surface text-fg" data-surface="paper" ref={wrapperRef}>
      <div className={cn("overflow-y-auto overscroll-contain rounded-card [scrollbar-width:thin]", boxClassName)} ref={boxRef}>
        <article className="@container/doc px-5 py-5 @min-[30rem]/doc:px-7 @min-[30rem]/doc:py-6" dir={layout.dir}>
          {layout.title !== null ? line(layout.title, "text-h3 text-fg") : null}
          {layout.meta.map((i) => line(i, "text-small text-fg-3"))}
          <div className={cn("flex flex-col", (layout.title !== null || layout.meta.length > 0) && "mt-3")}>
            {layout.sections.map((section, s) => (
              <section
                className="grid gap-x-5 gap-y-0.5 border-t border-border py-2.5 first:border-t-0 first:pt-1 @min-[30rem]/doc:grid-cols-[6.25rem_minmax(0,1fr)]"
                key={section.heading ?? `loose-${s}`}
              >
                {section.heading !== null ? (
                  line(section.heading, "text-small font-semibold leading-[1.75] text-fg")
                ) : (
                  <span aria-hidden className="hidden @min-[30rem]/doc:block" />
                )}
                <div className="flex min-w-0 flex-col">
                  {section.items.map((i) => line(i, "text-small leading-[1.75] text-fg-2", lines[i]?.listMark === true))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
      {/* the reading: a pale veil over what is not read yet lifts behind the scan line (transform only, linear) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-card">
        <motion.div
          animate={{ y: scan === "pending" ? "0%" : "100%" }}
          className="absolute inset-0 bg-surface/70"
          initial={false}
          transition={scan === "running" ? { duration: SCAN_SECONDS, ease: "linear" } : { duration: 0 }}
        />
        <ScanLine duration={SCAN_SECONDS} playing={scan === "running"} />
      </div>
      {overlay}
    </div>
  );
});

/** The scan's pass, inside `read` (1.2 s): it starts once the sheet has risen in. */
export const SCAN_SECONDS = 1.0;
