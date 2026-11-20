// Owner: learn. Arabic sentences carry Latin numbers with a sign or a percent («من 70% إلى 90%», «+20%»). Inside right-to-left
// text the percent and the plus sign jump to the wrong side unless the run is isolated left to right (DESIGN 2.3). This
// wraps every such run of a finished sentence in <bdi dir="ltr">, so copy can stay one verbatim string.
import { Fragment, type ReactNode } from "react";

const RUN = /([+−-]?\d[\d,.]*%|[+−]\d[\d,.]*)/g;

export function Ltr({ text }: { readonly text: string }): ReactNode {
  const parts = text.split(RUN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <bdi className="tabular-nums" dir="ltr" key={i}>
            {part}
          </bdi>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const NBSP = " ";

/** Keeps a multi-word Latin name on one line inside Arabic text («Power BI», «Power Query», «Google Analytics»). */
export function keepLatin(text: string): string {
  return text.replace(/([A-Za-z][\w.+#-]*) (?=[A-Za-z])/g, `$1${NBSP}`);
}
