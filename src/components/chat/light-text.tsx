// Light markdown for «دليلك»'s replies: paragraphs, line breaks, short lists (`- ` or `1. `) and **bold**. Nothing else is
// interpreted: no links, no images, no HTML. The text is never injected as HTML; it becomes React text nodes, so a reply
// can never add markup or fetch anything. Latin runs (SQL, Power BI, 70%, +200 XP, DL-2026-0001) are isolated left to
// right, so a sign or a percent never jumps to the wrong side inside Arabic (DESIGN.md 2.3).
import { Fragment, type ReactNode } from "react";

export type LightBlock =
  | { readonly kind: "p"; readonly lines: readonly string[] }
  | { readonly kind: "ul" | "ol"; readonly items: readonly string[]; readonly start: number };

const BULLET = /^\s*(?:[-*•])\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,2})[.)]\s+(.*)$/;

/** Splits a reply into blocks: a blank line ends a paragraph; consecutive list lines make one list. */
export function parseLight(text: string): LightBlock[] {
  const blocks: LightBlock[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[]; start: number } | null = null;
  const flushPara = () => {
    if (para.length > 0) blocks.push({ kind: "p", lines: para });
    para = [];
  };
  const flushList = () => {
    if (list && list.items.length > 0) blocks.push(list);
    list = null;
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      flushPara();
      const kind = bullet ? "ul" : "ol";
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [], start: numbered ? Number(numbered[1]) : 1 };
      }
      list.items.push((bullet ? bullet[1] : numbered?.[2]) ?? "");
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}

// A Latin run: starts with a letter or digit (or + before a digit), may hold spaces between Latin words, and ends with a
// letter, a digit or % (never with a full stop or a comma, which belong to the Arabic sentence around it).
const LATIN_RUN = /\+?[A-Za-z0-9](?:[A-Za-z0-9.,%+#_-]*[A-Za-z0-9%+#])?(?:\s+[A-Za-z0-9](?:[A-Za-z0-9.,%+#_-]*[A-Za-z0-9%+#])?)*/g;

function isolate(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <bdi dir="ltr" key={`${key}-${i++}`}>
        {match[0]}
      </bdi>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** One line of inline text: **bold** and isolated Latin runs. An unmatched ** is shown as written. */
export function LightInline({ text }: { readonly text: string }) {
  const parts = text.split("**");
  const closed = parts.length % 2 === 1;
  return (
    <>
      {parts.map((part, i) => {
        const bold = closed && i % 2 === 1;
        const nodes = isolate(!closed && i > 0 ? `**${part}` : part, `r${i}`);
        return bold ? (
          <strong className="font-semibold text-fg" key={i}>
            {nodes}
          </strong>
        ) : (
          <Fragment key={i}>{nodes}</Fragment>
        );
      })}
    </>
  );
}

/** One block of a reply. Lists carry Darb's markers: a short trail dash for bullets, Latin numerals for steps. */
export function LightBlockView({ block }: { readonly block: LightBlock }) {
  if (block.kind === "p") {
    return (
      <p className="text-body text-fg">
        {block.lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 ? <br /> : null}
            <LightInline text={line} />
          </Fragment>
        ))}
      </p>
    );
  }
  const Tag = block.kind;
  return (
    <Tag className="flex flex-col gap-1.5 text-body text-fg" start={block.kind === "ol" && block.start !== 1 ? block.start : undefined}>
      {block.items.map((item, i) => (
        <li className="flex items-baseline gap-2.5" key={i}>
          {block.kind === "ul" ? (
            <span aria-hidden className="relative top-[-0.2em] inline-block h-0.5 w-2.5 shrink-0 rounded-full bg-fg-3" />
          ) : (
            <span aria-hidden className="min-w-4 shrink-0 text-small font-semibold text-fg-3 tabular-nums" dir="ltr">
              {block.start + i}
            </span>
          )}
          <span className="min-w-0">
            <LightInline text={item} />
          </span>
        </li>
      ))}
    </Tag>
  );
}

/** A whole reply rendered at once (no motion). AdvisorMessage renders the same blocks one by one into focus. */
export function LightText({ text, className }: { readonly text: string; readonly className?: string }) {
  return (
    <div className={className ?? "flex flex-col gap-3"}>
      {parseLight(text).map((block, i) => (
        <LightBlockView block={block} key={i} />
      ))}
    </div>
  );
}
