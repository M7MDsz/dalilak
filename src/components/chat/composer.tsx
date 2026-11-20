"use client";
// Composer (playbook block 20): a pill that springs open into a card when focused and grows with the text.
// - Enter sends, Shift+Enter adds a line, Enter during IME composition does nothing, Escape closes the empty card.
// - ONE round button at the inline-end (the left): Send (an up arrow) or Stop. On send the arrow leaves upward with the
//   message and a new one re-enters from below (16 px, 520 ms); while «دليلك» answers the Stop face turns in, and the face
//   not in use turns away small and blurred.
// - A disabled state with its hint; an optional slot for the attach-CV chip in the open card's footer.
// The card's height is animated on this one element (a spring to open and close, a quick tween per new line), as the
// a reference chat composer does: scaling the box instead (`layout`) would thin its 1.5 px border mid-flight. Nothing else in the
// kit animates a height.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";

import { IconArrowUp, IconClose, IconFile, IconStop, IconUpload } from "@/components/icons";
import { useInstant } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { ease, spring, tween } from "@/lib/motion";

/** Imperative handle (React 19 `ref` prop): lets a page or a script focus the field or send what is in it. */
export interface ComposerHandle {
  focus: () => void;
  /** Sends the current text exactly as Enter would (the arrow leaves, the card closes). */
  send: () => void;
  /** Closes the card back to the pill (as Escape does) without sending. */
  tuck: () => void;
}

export interface ComposerProps {
  /** Controlled text. Without it the composer keeps its own text. */
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  /** Called with the trimmed text (at most `maxLength` characters). */
  readonly onSend: (text: string) => void;
  /** «دليلك» is answering or acting: the round button is Stop, and Enter does not send. */
  readonly responding?: boolean;
  readonly onStop?: () => void;
  /** Nothing can be typed or sent; the hint says why (it replaces the placeholder). */
  readonly disabled?: boolean;
  readonly disabledHint?: string;
  /** Default «اسأل دليلك أو اطلب منه أن يفتح لك صفحة…» (spec 3.14). Onboarding: «اكتب إجابتك أو اختر من الخيارات…». */
  readonly placeholder?: string;
  /** The field's accessible name. Default «رسالتك إلى دليلك». */
  readonly label?: string;
  /** Characters sent (spec 3.14: the first 500). Default 500. */
  readonly maxLength?: number;
  /** Optional slot in the open card's footer, at the inline-start: the attach-CV chip (AttachChip). */
  readonly attachment?: ReactNode;
  /** The key hint in the open card's footer when there is no attachment. Set to null to hide it. */
  readonly keyHint?: string | null;
  /** True while the user is typing (focused, with text): drives «دليلك»'s `listening` glyph. */
  readonly onTypingChange?: (typing: boolean) => void;
  readonly autoFocus?: boolean;
  readonly ref?: Ref<ComposerHandle>;
  readonly className?: string;
  /** Test ids of the field, the send face and the stop face (welcome-input / welcome-send, advisor-input / -send / -stop). */
  readonly testIds?: { readonly input?: string; readonly send?: string; readonly stop?: string };
}

const PILL = 52; // px: the closed pill
const LINE = 26; // px: one line of text (16 px at 1.625)
const PAD_TOP = 13; // (PILL - LINE) / 2: one line sits in the middle of the pill
const FOOTER = 52; // px: the open card's footer row, the round button sits in it (40 px + 6 px under it)
const MAX_TEXT = LINE * 6; // six lines, then the text scrolls

const supportsFieldSizing = typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content");

/** The chat input of the onboarding conversation and the advisor panel. */
export function Composer({
  value: controlled,
  onValueChange,
  onSend,
  responding = false,
  onStop,
  disabled = false,
  disabledHint,
  placeholder = "اسأل دليلك أو اطلب منه أن يفتح لك صفحة…",
  label = "رسالتك إلى دليلك",
  maxLength = 500,
  attachment,
  keyHint = "Enter للإرسال · Shift + Enter لسطر جديد",
  onTypingChange,
  autoFocus = false,
  ref,
  className,
  testIds,
}: ComposerProps) {
  const id = useId();
  const instant = useInstant();
  const area = useRef<HTMLTextAreaElement>(null);
  const [own, setOwn] = useState("");
  const value = controlled ?? own;
  const setValue = (next: string) => {
    if (controlled === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const [focused, setFocused] = useState(false);
  const [tucked, setTucked] = useState(false); // closed by Escape or by sending while the focus stays in the field
  const [textHeight, setTextHeight] = useState(LINE);
  const [kind, setKind] = useState<"spring" | "line">("spring"); // how the next height change moves
  const [arrow, setArrow] = useState(0); // a new key = the arrow re-enters from below

  const open = value !== "" || (!disabled && focused && !tucked);
  const canSend = !disabled && !responding && value.trim() !== "";
  const height = open ? PAD_TOP + Math.min(textHeight, MAX_TEXT) + FOOTER - 6 : PILL;

  // the text's natural height: field-sizing: content grows the textarea (Chromium); elsewhere a three-line autosize
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    if (!supportsFieldSizing) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    setTextHeight(Math.max(LINE, el.scrollHeight));
  }, [value, open]);
  // a narrower panel re-wraps the text: read it again
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setTextHeight(Math.max(LINE, el.scrollHeight)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // (after a reply ends the arrow is mounted again, so it re-enters from below by itself)

  // typing -> «دليلك» listens
  const typing = focused && value.trim() !== "";
  const lastTyping = useRef(false);
  useEffect(() => {
    if (lastTyping.current === typing) return;
    lastTyping.current = typing;
    onTypingChange?.(typing);
  }, [typing, onTypingChange]);

  const send = () => {
    if (!canSend) return;
    onSend(value.trim().slice(0, maxLength));
    setValue("");
    setKind("spring");
    setTucked(true);
    setArrow((n) => n + 1);
  };

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
    send,
    tuck: () => {
      setKind("spring");
      setTucked(true);
    },
  }));

  const sizeTransition = instant ? { duration: 0 } : kind === "spring" ? spring.gentle : tween.fast;
  const face = "absolute inset-0 grid place-items-center transition-[opacity,filter,scale,rotate] duration-200 ease-out";
  const showHint = open && !attachment && keyHint !== null && !disabled;

  return (
    <motion.div
      animate={{ height, borderRadius: open ? 20 : PILL / 2 }}
      className={cn(
        // inline-size containment: the placeholder (one line, field-sizing: content) never widens the column it sits in
        "skin-composer relative w-full min-w-0 overflow-hidden border-[1.5px] bg-surface [contain:inline-size] transition-[border-color,box-shadow,background-color] duration-200 ease-out",
        disabled
          ? "border-border bg-surface-2"
          : "border-border-strong focus-within:border-fg focus-within:ring-3 focus-within:ring-halo hover:border-fg-2",
        className,
      )}
      data-open={open ? "" : undefined}
      data-state={disabled ? "disabled" : responding ? "responding" : open ? "open" : "closed"}
      initial={false}
      onClick={(event) => {
        // a click anywhere on the card (the footer too) puts the caret in the text
        if (event.target === event.currentTarget) area.current?.focus();
      }}
      style={{ height: PILL, borderRadius: PILL / 2 }}
      title={disabled ? disabledHint : undefined}
      transition={sizeTransition}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        aria-describedby={`${id}-hint`}
        autoFocus={autoFocus}
        className={cn(
          "block w-full resize-none bg-transparent ps-5 pe-15 text-[1rem] leading-[1.625rem] text-fg caret-accent outline-none",
          "placeholder:text-fg-3 disabled:text-fg-3 [field-sizing:content]",
          // typed English runs left to right inside the Arabic field; an empty field keeps the caret at the right
          value !== "" && "[unicode-bidi:plaintext]",
          // closed: one line; a long placeholder wraps and its second line is clipped, so it ends on a whole word
          open ? "overflow-y-auto" : "overflow-hidden",
        )}
        data-testid={testIds?.input}
        disabled={disabled}
        enterKeyHint="send"
        id={id}
        maxLength={4000}
        onBlur={() => {
          setFocused(false);
          setTucked(false);
          setKind("spring");
        }}
        onChange={(event) => {
          setKind(value === "" && !open ? "spring" : "line");
          setTucked(false);
          setValue(event.target.value);
        }}
        onFocus={() => {
          setFocused(true);
          setKind("spring");
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value === "" && open) {
            event.preventDefault();
            setKind("spring");
            setTucked(true);
            return;
          }
          if (event.key !== "Enter" || event.shiftKey) return;
          // IME composition (Arabic/Japanese input methods): Enter confirms the composition, never sends
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          send();
        }}
        placeholder={disabled ? (disabledHint ?? placeholder) : placeholder}
        ref={area}
        rows={1}
        style={{ marginTop: PAD_TOP, maxHeight: open ? MAX_TEXT : LINE, minHeight: LINE }}
        value={value}
      />

      {/* footer: the attachment slot or the key hint at the inline-start, the round button at the inline-end */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[52px] items-center gap-2 ps-3 pe-1.5">
        <AnimatePresence initial={false}>
          {open && attachment ? (
            <motion.div animate={{ opacity: 1 }} className="pointer-events-auto flex min-w-0 items-center" exit={{ opacity: 0, transition: tween.exit }} initial={{ opacity: 0 }} key="attach" transition={{ ...tween.fast, delay: 0.08 }}>
              {attachment}
            </motion.div>
          ) : null}
          {/* the Enter / Shift+Enter hint means nothing on a touch keyboard: kept for screen readers, not painted */}
          {showHint ? (
            <motion.span animate={{ opacity: 1 }} className="min-w-0 truncate ps-2 text-caption text-fg-3 pointer-coarse:invisible" exit={{ opacity: 0, transition: tween.exit }} id={`${id}-hint`} initial={{ opacity: 0 }} key="hint" transition={{ ...tween.fast, delay: 0.08 }}>
              {keyHint}
            </motion.span>
          ) : null}
        </AnimatePresence>
        {!showHint ? (
          <span className="sr-only" id={`${id}-hint`}>
            {disabled ? disabledHint : keyHint}
          </span>
        ) : null}

        <button
          aria-label={responding ? "إيقاف" : "إرسال"}
          className={cn(
            "pointer-events-auto relative ms-auto grid size-10 shrink-0 place-items-center overflow-hidden rounded-full",
            "transition-[background-color,color,scale,translate] duration-200 ease-out active:scale-[0.94] active:transition-none",
            responding || canSend ? "bg-solid text-on-solid hover:bg-fg-2" : "bg-surface-2 text-fg-3",
            disabled && "bg-transparent",
          )}
          data-mode={responding ? "stop" : "send"}
          data-testid={responding ? testIds?.stop : testIds?.send}
          disabled={!responding && !canSend}
          onClick={(event) => {
            event.stopPropagation();
            if (responding) onStop?.();
            else send();
          }}
          onMouseDown={(event) => event.preventDefault() /* keep the caret in the field */}
          title={responding ? "إيقاف" : "إرسال (Enter)"}
          type="button"
        >
          {/* Send: the arrow. It leaves upward with the message, and a new one re-enters from below. */}
          <AnimatePresence initial={false}>
            {!responding ? (
              <motion.span
                animate={{ y: 0, opacity: 1 }}
                className="absolute inset-0 grid place-items-center"
                exit={{ y: -16, opacity: 0, transition: tween.exit }}
                initial={{ y: 16, opacity: 0 }}
                key={arrow}
                transition={{ duration: 0.52, ease: ease.out }}
              >
                <IconArrowUp size={20} waypoint={canSend ? "on" : "muted"} />
              </motion.span>
            ) : null}
          </AnimatePresence>
          {/* Stop: turns in while «دليلك» answers; turns away small and blurred when not in use */}
          <span aria-hidden className={cn(face, responding ? "" : "scale-50 rotate-90 opacity-0 blur-[2px]")}>
            <IconStop size={18} />
          </span>
        </button>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ AttachChip

export interface AttachChipProps {
  /** The attached file's name; without it the chip offers to attach. */
  readonly fileName?: string;
  /** Opens the file picker (the caller owns the input) or goes to the CV page. */
  readonly onAttach?: () => void;
  readonly onRemove?: () => void;
  readonly label?: string;
  readonly className?: string;
  readonly testId?: string;
}

/** The attach-CV chip for the composer's footer: «أرفق سيرتك», or the attached file with a remove button. */
export function AttachChip({ fileName, onAttach, onRemove, label = "أرفق سيرتك", className, testId }: AttachChipProps) {
  if (fileName) {
    return (
      <span className={cn("inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full border border-border-strong bg-surface ps-2.5 pe-1 text-small font-medium text-fg", className)} data-testid={testId}>
        <IconFile size={16} waypoint="muted" />
        <bdi className="min-w-0 truncate" dir="ltr">
          {fileName}
        </bdi>
        <button aria-label="إزالة الملف" className="grid size-6 shrink-0 place-items-center rounded-full text-fg-2 hover:bg-hover" onClick={onRemove} type="button">
          <IconClose size={14} waypoint="off" />
        </button>
      </span>
    );
  }
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-border-strong px-3 text-small font-medium text-fg-2",
        "transition-[border-color,color,scale,translate] duration-200 ease-out hover:border-solid hover:border-fg hover:text-fg active:scale-[0.97] active:transition-none",
        className,
      )}
      data-testid={testId}
      onClick={onAttach}
      type="button"
    >
      <IconUpload size={16} />
      <span>{label}</span>
    </button>
  );
}

