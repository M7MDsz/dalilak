"use client";
// Owner: advisor. The panel «دليلك» (spec 3.14; playbook 3.12): one conversation that follows the user across the app.
//
// Desktop (≥ 1024 px): a floating sheet on the inline-end side (the left), 420 px wide, inset 8 px, that docks at
// ≥ 1280 px (the shell gives the content `padding-inline-end: 436px`) and overlays without a scrim below that. It never
// traps focus: the page beside it stays usable, and «دليلك» changes that page while the panel stays put.
// Phone: a full-screen sheet that traps focus. Desktop arrives as Dalilak's form of the side-panel chat opening: it grows
// out of the launcher with a fade; inside, the header, the thread and the composer rise 60 ms apart, and «دليلك»'s glyph
// travels from the launcher into the header (AdvisorRoot). The phone sheet only fades in place (see OUT_PHONE).
//
// The panel stays mounted when closed (hidden and inert), so the thread keeps its scroll and a reply that lands while
// it is closed is simply there when it opens again: the thread is restored, never replayed.
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";

import { ChatThread, Composer, DaleelGlyph, ReplyChips, type ComposerHandle, type ReplyChip } from "@/components/chat";
import { IconClose, IconNewChat } from "@/components/icons";
import { Collapse, useGo } from "@/components/motion";
import { IconButton, cn, toast } from "@/components/ui";
import { pageChips } from "@/lib/brain/advisor";
import { TOAST_COPY } from "@/lib/copy";
import { useAppStore, useClock, useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { Chip } from "@/lib/types";

import { ADVISOR_COPY } from "./copy";
import { useLive } from "./live";
import { routeContext } from "./page-context";
import { greetIfEmpty, sendMessage, stopTurn } from "./runner";
import { toReplyChips, useThreadRows } from "./thread-view";

/** The press frame a chip shows before its message goes (DESIGN 7: «دليلك» pressing is seen, then the action follows). */
const PRESS_MS = 160;

// The arrival is a CSS transition of opacity and translate, which the browser runs on the compositor: a busy main
// thread (the docking reflow beside it, a dev-server render) can never freeze or skip it. In: 200 ms, ease-out. Out:
// 150 ms, ease-in, and only then hidden. The panel sits at the inline-end (the physical left), so it comes 16 px from
// further left. (Playbook 3.12's decided fallback route, in the same register.)
// 18 Nov (Mohammed: "make a cool transition, the site feels heavy when you open the chatbot"): the page no longer
// squeezes to dock the panel (AppShell), and on desktop the panel now GROWS OUT OF THE LAUNCHER: its origin is the
// launcher's corner (bottom, physical left), it scales up from 94% while it slides 12 px in and fades, 280 ms on the
// soft ease-out; closing folds it back into that corner in 160 ms. Opacity, translate and scale only: compositor work.
const IN =
  "visible opacity-100 translate-x-0 translate-y-0 scale-100 [transition:opacity_180ms_var(--ease-out),translate_280ms_var(--ease-out),scale_280ms_var(--ease-out),visibility_0s]";
const OUT_DESKTOP =
  "invisible opacity-0 -translate-x-3 translate-y-4 scale-[0.94] [transition:opacity_140ms_var(--ease-in),translate_160ms_var(--ease-in),scale_160ms_var(--ease-in),visibility_0s_linear_160ms]";
// 21 Nov (Mohammed: "in the phone ui when you open the chat, the current chat goes up"): the phone sheet IS the screen,
// so its 24 px rise, its scale from 98% at the bottom edge and the inner 8 px rises carried the whole conversation about
// 35 px up the screen on every opening (and on every return after «دليلك» showed a page), the composer starting under
// the bottom edge. The phone sheet now only fades, 180 ms in, 150 ms out, with nothing inside rising: the conversation,
// its newest message and the composer are where they rest from the first frame it shows. Desktop is unchanged.
const IN_PHONE = "visible opacity-100 [transition:opacity_180ms_var(--ease-out),visibility_0s]";
const OUT_PHONE = "invisible opacity-0 [transition:opacity_150ms_var(--ease-in),visibility_0s_linear_150ms]";

export interface AdvisorPanelProps {
  readonly phone: boolean;
  /**
   * The panel's motion state, one or two frames behind the store's advisorOpen (AdvisorRoot): the heavy commit of an
   * opening (the shell's docking reflow, the thread) lands first, then the motion starts on a free main thread, so not a
   * frame of the 200 ms arrival is lost. On close the panel stays put while the page re-widens beneath it, then leaves.
   */
  readonly entered: boolean;
  /** The header glyph's slot (the travelling glyph lands here). */
  readonly glyphSlotRef?: Ref<HTMLSpanElement>;
  readonly panelRef?: Ref<HTMLElement>;
  /** Hide the header glyph while the travelling one is in flight. */
  readonly glyphHidden?: boolean;
  /** Focus the composer once the panel has arrived (opened from the launcher or Ctrl+K, not from a page button). */
  readonly focusOnOpen: () => boolean;
}

export function AdvisorPanel({ phone, entered, glyphSlotRef, panelRef, glyphHidden = false, focusOnOpen }: AdvisorPanelProps) {
  const open = useUi((s) => s.advisorOpen);
  const busy = useUi((s) => s.advisorBusy);
  const brain = useUi((s) => s.brain);
  const applyRun = useUi((s) => s.applyRun);
  const user = useCurrentUser();
  const clock = useClock();
  const pathname = usePathname();
  const go = useGo();
  const titleId = useId();
  const composer = useRef<ComposerHandle>(null);
  const [typing, setTyping] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // the first open after onboarding (an empty thread): once the panel is in, «دليلك» greets (he does not introduce himself
  // again: the same character ran the onboarding)
  useEffect(() => {
    if (!entered) return;
    const timer = window.setTimeout(greetIfEmpty, 160);
    return () => window.clearTimeout(timer);
  }, [entered]);

  // the composer takes focus once the panel is in (desktop, launcher or Ctrl+K)
  useEffect(() => {
    if (!entered || phone || !focusOnOpen()) return;
    const timer = window.setTimeout(() => composer.current?.focus(), 200);
    return () => window.clearTimeout(timer);
  }, [entered, phone, focusOnOpen]);

  const close = useCallback(() => useUi.getState().closeAdvisor(), []);

  /** Cards and receipts open their page; on a phone the sheet steps aside first so the page is seen. */
  const openPage = useCallback(
    (href: string) => {
      if (phone) useUi.getState().closeAdvisor();
      go(href);
    },
    [go, phone],
  );

  /** A chip is the user speaking: the press is seen, then the message goes with its payload (5.4 point 1). */
  const pressChip = useCallback((chip: Chip, key: string) => {
    if (useUi.getState().advisorBusy) return;
    setPressedKey(key);
    window.setTimeout(() => {
      setPressedKey(null);
      sendMessage({ text: chip.label, chip: chip.payload });
    }, PRESS_MS);
  }, []);

  const { rows, replyChipsShown } = useThreadRows({ onOpen: openPage, onChip: pressChip, pressedKey });
  // the thread does not depend on the panel's motion state: flipping it (the arrival) re-renders nothing inside
  const thread = useMemo(
    () => (
      <ChatThread busy={busy} contentClassName="gap-6 px-4 pt-5 pb-6 [&_bdi]:whitespace-nowrap" label={ADVISOR_COPY.threadLabel} testId={TID.advisor.thread}>
        {rows}
      </ChatThread>
    ),
    [busy, rows],
  );

  // the page's suggestion chips (5.8), for the page on screen; they step aside while a reply shows its own
  const suggestions = useMemo(() => {
    if (!user) return [] as readonly Chip[];
    return pageChips({ ...routeContext(pathname), applySheetOpen: false, showRunning: false }, user, clock);
  }, [user, clock, pathname]);
  // while a reply shows its own chips the page chips are folded away (still in the DOM for the fold): they carry no
  // test id then, so an id such as advisor-chip-next-step is never in the page twice
  const suggestionChips = useMemo<ReplyChip[]>(
    () =>
      toReplyChips(suggestions, "page:").map((chip, i) => ({
        ...chip,
        testId: replyChipsShown ? undefined : TID.advisor.chip(suggestions[i]?.slug ?? ""),
      })),
    [suggestions, replyChipsShown],
  );
  const pickSuggestion = (chip: ReplyChip) => {
    const source = suggestions[suggestionChips.findIndex((c) => c.id === chip.id)];
    if (source) pressChip(source, chip.id);
  };

  const newChat = () => {
    if (useUi.getState().advisorBusy) return;
    useAppStore.getState().clearAdvisorThread();
    useLive.getState().reset();
    toast({ title: TOAST_COPY.newChat });
    greetIfEmpty();
  };

  // from step 5 of «دليلك»'s application a pressed send cannot be stopped: the control is gone (7.4)
  const stopGone = applyRun !== null && applyRun.result === null && applyRun.step >= 5;
  const mode = brain?.mode === "online" ? "online" : "local";

  // phones: the sheet traps focus (2.9)
  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (!phone || event.key !== "Tab") return;
    const focusables = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // each opening replays the inner rise (CSS: removing and adding the animation restarts it); desktop only: on a phone
  // the sheet is the whole screen and nothing in it moves as it arrives
  const rise = entered && !phone ? "animate-rise" : "";

  return (
    <section
      aria-hidden={open ? undefined : true}
      aria-labelledby={titleId}
      aria-modal={phone ? true : undefined}
      className={cn(
        "fixed z-panel flex flex-col overflow-hidden bg-surface text-fg",
        phone ? "kb-fit inset-0" : "inset-y-2 end-2 w-[420px] origin-bottom-left rounded-sheet border border-border shadow-float",
        phone ? (entered ? IN_PHONE : OUT_PHONE) : entered ? IN : OUT_DESKTOP,
      )}
      data-entered={entered ? "" : undefined}
      data-state={open ? "open" : "closed"}
      data-testid={TID.advisor.panel}
      inert={!open}
      onKeyDown={trapFocus}
      ref={panelRef}
      role="dialog"
    >
      {/* phone: `kb-fit` (globals.css) shrinks the sheet to the visible box while the keyboard is up, so the composer
          rides on the keyboard instead of hiding behind it (src/features/shared/keyboard.ts) */}
      <header className={cn("flex shrink-0 items-center gap-3 py-3 ps-4 pe-2.5", phone && "pt-[max(0.75rem,env(safe-area-inset-top))]")}>
        {/* the glyph slot never moves: the travelling glyph lands exactly here (the words beside it rise) */}
        <span className="inline-flex shrink-0" ref={glyphSlotRef}>
          <DaleelGlyph className={glyphHidden ? "opacity-0" : undefined} framed size={40} state={typing ? "listening" : "idle"} />
        </span>
        <div className={cn("min-w-0 flex-1", rise, "[animation-delay:40ms]")}>
          <h2 className="text-title leading-6 font-bold text-fg" id={titleId}>
            {ADVISOR_COPY.name}
          </h2>
          <p className="truncate text-small text-fg-3">{ADVISOR_COPY.headerLine}</p>
        </div>
        <div className={cn("flex shrink-0 items-center", rise, "[animation-delay:40ms]")}>
          <IconButton data-testid={TID.advisor.clear} disabled={busy} icon={<IconNewChat size={20} />} label={ADVISOR_COPY.newChat} onClick={newChat} tip={!phone} />
          <IconButton data-testid={TID.advisor.close} icon={<IconClose size={20} waypoint="off" />} label={ADVISOR_COPY.close} onClick={close} tip={!phone} />
        </div>
      </header>

      <p
        className={cn("shrink-0 border-y border-border bg-bg px-4 py-2 text-small leading-6 text-fg-2", rise, "[animation-delay:70ms]")}
        data-state={mode}
        data-testid={TID.advisor.mode}
      >
        {mode === "online" ? ADVISOR_COPY.modeOnline : ADVISOR_COPY.modeLocal}
      </p>

      <div className={cn("flex min-h-0 flex-1 flex-col", rise, "[animation-delay:100ms]")}>{thread}</div>

      <div className={cn("flex shrink-0 flex-col px-3 pt-1 pb-3", phone && "pb-[max(0.75rem,env(safe-area-inset-bottom))]", rise, "[animation-delay:160ms]")}>
        <Collapse open={!replyChipsShown && suggestionChips.length > 0}>
          <ReplyChips
            chips={suggestionChips}
            className="px-1 pt-1 pb-3"
            disabled={busy}
            key={pathname}
            label={ADVISOR_COPY.chipsLabel}
            onPick={pickSuggestion}
            pressedId={pressedKey}
          />
        </Collapse>
        <Composer
          disabled={stopGone}
          onSend={(text) => sendMessage({ text })}
          onStop={stopTurn}
          onTypingChange={setTyping}
          placeholder={ADVISOR_COPY.placeholder}
          ref={composer}
          responding={busy && !stopGone}
          testIds={{ input: TID.advisor.input, send: TID.advisor.send, stop: TID.advisor.stop }}
        />
      </div>
    </section>
  );
}
