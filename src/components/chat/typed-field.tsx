"use client";
// TypedField: a real form field that «دليل» fills while the user watches (the apply flow, spec 7.4; playbook 3.8).
// The text is the `value` of a controlled, read-only field (one text node, so Arabic letters join as it grows), revealed
// by useTypeOn in graphemes (names, cities) or words (the note) over the step's duration. While it fills, the field looks
// focused, an accent caret blinks at the end of the text (one of the five allowed loops), and «دليل»'s small mark sits at
// its inline-end. Fields filled one after another hand the mark on: it travels by a shared layout id.
// Stopping (`filling` false before the end) keeps what was written, and the field becomes editable.
import { motion } from "motion/react";
import { useEffect, useEffectEvent, useId, useMemo, useRef } from "react";

import { graphemes, useInstant, useTypeOn, words } from "@/components/motion";
import { FieldShell, fieldBox } from "@/components/ui";
import { cn } from "@/components/ui/cn";

import { DaleelGlyph } from "./daleel-glyph";

export interface TypedFieldProps {
  readonly label: string;
  /** What «دليل» writes. */
  readonly value: string;
  /** «دليل» is writing it now. Turning it on starts from empty; turning it off keeps what was written. */
  readonly filling: boolean;
  /** The step's length in ms (spec 7.4: fields 400 ms each, the note 2000 ms). The value is fully written a little
   *  before it ends (at 85%), so the last letter is seen. Default 400. */
  readonly ms?: number;
  /** Reveal by letters (default) or by words (a long note). */
  readonly by?: "graphemes" | "words";
  /** The field's value when «دليل» is not writing (it is editable then). Default: `value`. */
  readonly formValue?: string;
  /** The user edits the field; also called with what was written when filling stops. */
  readonly onValueChange?: (value: string) => void;
  /** The whole value has been written. */
  readonly onDone?: () => void;
  /** A long text (the application note): a growing text area. */
  readonly multiline?: boolean;
  readonly hint?: string;
  /** The shared id of «دليل»'s mark (one per form). Default "daleel-mark". */
  readonly markId?: string;
  readonly className?: string;
  readonly testId?: string;
}

export function TypedField({
  label,
  value,
  filling,
  ms = 400,
  by = "graphemes",
  formValue,
  onValueChange,
  onDone,
  multiline = false,
  hint,
  markId = "daleel-mark",
  className,
  testId,
}: TypedFieldProps) {
  const id = useId();
  const instant = useInstant();
  // a timer cannot tick faster than a frame: a long value in a short step reveals two or three letters per tick
  const units = useMemo(() => {
    const all = by === "words" ? words(value) : graphemes(value);
    const per = Math.ceil(all.length / Math.max(1, Math.floor((ms * 0.85) / 24)));
    if (per <= 1) return all;
    const out: string[] = [];
    for (let i = 0; i < all.length; i += per) out.push(all.slice(i, i + per).join(""));
    return out;
  }, [by, value, ms]);
  // the last letter lands at 85% of the step, so a script that moves on after exactly `ms` never cuts the word short
  const typed = useTypeOn(units, ms * 0.85, filling);
  const shown = filling ? typed.value : (formValue ?? value);

  const written = useRef("");
  written.current = typed.value;
  const handBack = useEffectEvent(() => onValueChange?.(written.current));
  const finished = useEffectEvent(() => onDone?.());
  const was = useRef(filling);
  useEffect(() => {
    if (was.current && !filling) handBack();
    was.current = filling;
  }, [filling]);
  useEffect(() => {
    if (filling && typed.done) finished();
  }, [filling, typed.done]);

  const common = {
    "aria-busy": filling || undefined,
    className: cn(
      "min-w-0 w-full bg-transparent text-body text-fg caret-accent outline-none placeholder:text-fg-3",
      multiline ? "block max-h-[12lh] resize-none [field-sizing:content]" : "h-full",
    ),
    "data-filling": filling ? "" : undefined,
    "data-testid": testId,
    "data-value": value,
    id,
    readOnly: filling,
    value: shown,
    onChange: (event: { target: { value: string } }) => onValueChange?.(event.target.value),
  };

  return (
    <FieldShell className={className} hint={hint} id={id} label={label}>
      <div className={cn(fieldBox, multiline ? "items-start py-3" : "h-13", filling && "border-fg ring-3 ring-halo")}>
        <div className="relative min-w-0 flex-1 self-stretch">
          {multiline ? <textarea rows={3} style={{ minHeight: "3lh" }} {...common} /> : <input {...common} />}
          {filling && !instant ? (
            // the caret: an overlay that mirrors the text, invisible, with the blinking bar after its last letter
            <div aria-hidden className={cn("pointer-events-none absolute inset-0 text-body text-transparent", multiline ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "flex items-center whitespace-pre")}>
              <span>{typed.value}</span>
              <motion.span
                animate={{ opacity: [1, 1, 0, 0] }}
                className={cn("inline-block w-0.5 rounded-full bg-accent align-middle", multiline ? "-mb-1 h-[1.15em]" : "h-5")}
                transition={{ duration: 1, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : null}
        </div>
        {filling ? <DaleelGlyph className={multiline ? "mt-0.5" : undefined} framed layoutId={markId} size={26} state="working" title="دليل يكتب" /> : null}
      </div>
    </FieldShell>
  );
}
