// Owner: cv. Latin runs inside Arabic text go in <bdi> (DESIGN.md 2.3), so «Excel.» keeps its full stop at the Arabic end
// and «Power BI» stays one word. A sentence that starts with a Latin word (an English CV) is isolated as a whole by the
// caller (`dir="auto"` on the line, or <bdi> round a quote).
import { Fragment, type ReactNode } from "react";

/** A Latin word, then more Latin words or numbers separated by spaces («Power BI», «Python 3», «C++», «Node.js»). */
const LATIN_RUN = /[A-Za-z][A-Za-z0-9+#.\-/]*(?:\s+[A-Za-z0-9][A-Za-z0-9+#.\-/]*)*/g;

export type Run = { readonly text: string; readonly latin: boolean };

/** Splits `text` into Arabic and Latin runs. A trailing «.» or «-» stays with the Arabic text that follows. */
export function bidiRuns(text: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const start = match.index ?? 0;
    const word = match[0].replace(/[.\-/]+$/u, "");
    if (word === "") continue;
    if (start > last) runs.push({ text: text.slice(last, start), latin: false });
    runs.push({ text: word, latin: true });
    last = start + word.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), latin: false });
  return runs;
}

/** Renders `text` with every Latin run isolated in <bdi>. */
export function Bidi({ text }: { readonly text: string }): ReactNode {
  return (
    <>
      {bidiRuns(text).map((run, i) => (
        <Fragment key={i}>{run.latin ? <bdi>{run.text}</bdi> : run.text}</Fragment>
      ))}
    </>
  );
}

/** A percentage or a signed number («90%», «+20%», «+100»): its sign must stay on its own side inside Arabic. */
const NUMBER_RUN = /[+−-]?\d[\d,.]*%|[+−]\d[\d,.]*/gu;

/** A finished sentence with its Latin runs AND its percentages isolated («ترفعك إلى 90%.» never shows «%90»). */
export function BidiLine({ text }: { readonly text: string }): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(NUMBER_RUN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(<Bidi key={`t${start}`} text={text.slice(last, start)} />);
    parts.push(
      <bdi className="tabular-nums" dir="ltr" key={`n${start}`}>
        {match[0]}
      </bdi>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(<Bidi key="end" text={text.slice(last)} />);
  return <>{parts}</>;
}

/** The direction a sentence starts in, by its first strong letter (Arabic or Latin); Arabic when it has neither. */
export function textDir(text: string): "rtl" | "ltr" {
  const first = /[A-Za-z\u0600-\u06FF]/u.exec(text)?.[0];
  return first !== undefined && /[A-Za-z]/.test(first) ? "ltr" : "rtl";
}
