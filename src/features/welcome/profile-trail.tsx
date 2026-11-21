"use client";
// Owner: welcome. «ملفك يتكوّن» (spec 3.2): the seven answers (20 Nov 2026: «الشركة» after «الاهتمام») as a trail in
// Darb's progress language. Each answer is a
// station: answered = the ink disc with its check (drawn), the question «دليلك» is asking now = your position (the
// accent waypoint), the rest = small open rings. The legs between them are solid where covered, the accent's dotted leg
// leads to the current question, the way ahead is dotted. When an answer is accepted (`slot-fill`) its value rolls in,
// its check is drawn and the leg to it is drawn in ink.
//   desktop: a labelled card beside the thread (label, value).
//   phone:   a row of seven small slots under the step indicator (spec 3.2 Phone).
// Every value element carries data-welcome-answer, so the reveal can start the answers from where they sit (answers-gather).
import { useEffect, useRef, useState } from "react";

import { Avatar, type AvatarId } from "@/components/avatars";
import { RewardChip, RewardRow, Tile } from "@/components/game";
import { Edge, Roll, StatusMark } from "@/components/motion";
import { cn } from "@/components/ui";
import { getQuestion, XP } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { ASKED_STEP_IDS } from "@/lib/ids";
import { TID } from "@/lib/testids";
import type { OnboardingStepId } from "@/lib/types";

import { CHAT_COPY } from "./copy";

export type SlotState = "filled" | "current" | "ahead";

export interface ProfileTrailProps {
  readonly name: string;
  readonly avatar: AvatarId;
  /** The printed answer per question, or null while unanswered. */
  readonly values: Readonly<Record<OnboardingStepId, string | null>>;
  /** The question «دليلك» is waiting on (your position), or null. */
  readonly pending: OnboardingStepId | null;
  /** Answers filled from the CV (docs/ONBOARDING-FLOW.md): tagged «من سيرتك». */
  readonly fromCv?: ReadonlySet<OnboardingStepId>;
  /** The steps that apply, in order (21 Nov 2026: «مجالك» only after «أتطوّر» / «أغيّر»); default: the asked steps. */
  readonly steps?: readonly OnboardingStepId[];
}

function stateOf(q: OnboardingStepId, values: ProfileTrailProps["values"], pending: OnboardingStepId | null): SlotState {
  if (values[q] !== null) return "filled";
  return q === pending ? "current" : "ahead";
}

/** Answers that became filled while this component was on screen draw their check and their leg (the rest are at rest). */
function useFreshFills(values: ProfileTrailProps["values"], steps: readonly OnboardingStepId[]) {
  const [initial] = useState(() => new Set(steps.filter((q) => values[q] !== null)));
  const [settled, setSettled] = useState<ReadonlySet<OnboardingStepId>>(() => new Set());
  const fresh = (q: OnboardingStepId) => values[q] !== null && !initial.has(q);
  const settle = (q: OnboardingStepId) => setSettled((s) => (s.has(q) ? s : new Set(s).add(q)));
  return { fresh, settled, settle };
}

function legState(from: SlotState, to: SlotState, drawing: boolean, settled: boolean) {
  if (to === "filled") return drawing && !settled ? "drawing" : "done";
  if (to === "current" && from === "filled") return "next";
  return "locked";
}

function Node({ state, appear, size = 22 }: { state: SlotState; appear: boolean; size?: number }) {
  if (state === "filled") return <StatusMark appear={appear} size={size} state="done" label="" />;
  if (state === "current") {
    return (
      <span aria-hidden className="relative grid shrink-0 place-items-center rounded-full border-2 border-fg bg-surface" style={{ width: size, height: size }}>
        <span className="block size-2 rounded-full bg-accent" />
      </span>
    );
  }
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span className="block size-3 rounded-full border-2 border-border-strong bg-surface" />
    </span>
  );
}

// ------------------------------------------------------------------------------------------------ desktop: the sheet

const ROW = 62; // px per station
const NODE_PX = 22;

/**
 * The character sheet (docs/GAME-LAYER.md 5.7): a flat ink plate (it is read, not pressed). Its header is the player:
 * avatar, name, «ملفك يتكوّن» and how many of the seven slots are filled («2 من 7», the number rolls on `slot-fill`). Under
 * it the seven slots on their trail; at its foot the one real reward of this page, «تكسب +50 XP» (spec 8.1
 * `onboarding_completed`), which turns earned (and lands once) when the last answer is accepted.
 */
export function ProfileCard({ name, avatar, values, pending, fromCv, steps = ASKED_STEP_IDS }: ProfileTrailProps) {
  const { fresh, settled, settle } = useFreshFills(values, steps);
  const states = steps.map((q) => stateOf(q, values, pending));
  const filled = states.filter((s) => s === "filled").length;
  const complete = filled === steps.length;
  // the reward lands only when it is earned in front of the user (a restored, complete sheet shows it at rest)
  const [completeOnArrival] = useState(complete);
  return (
    <Tile faceClassName="overflow-hidden" interactive={false}>
      <div className="flex items-center gap-3 px-card pt-4 pb-4">
        <Avatar id={avatar} size={48} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="min-w-0 truncate text-title text-fg">{name}</p>
          <p className="text-small text-fg-2">{CHAT_COPY.profileCard}</p>
        </div>
        <p aria-label={`${formatNumber(filled)} من ${formatNumber(steps.length)}`} className="flex shrink-0 items-baseline gap-1 tabular-nums">
          <Roll className="h-[1.6em] text-h3 font-bold text-fg" id={filled}>
            {formatNumber(filled)}
          </Roll>
          <span className="text-small font-semibold text-fg-3">من {formatNumber(steps.length)}</span>
        </p>
      </div>
      <div className="border-t border-border px-card py-2">
      <div className="relative">
        {/* the legs, in one svg down the node column (inline-start side) */}
        <svg aria-hidden className="pointer-events-none absolute top-0 start-0 overflow-visible" height={ROW * steps.length} width={NODE_PX}>
          {steps.slice(1).map((q, i) => {
            const y1 = ROW * i + ROW / 2 + NODE_PX / 2 + 3;
            const y2 = ROW * (i + 1) + ROW / 2 - NODE_PX / 2 - 3;
            const from = states[i] ?? "ahead";
            const to = states[i + 1] ?? "ahead";
            return (
              <Edge
                d={`M ${NODE_PX / 2} ${y1} L ${NODE_PX / 2} ${y2}`}
                delay={0.05}
                key={q}
                onDrawn={() => settle(q)}
                state={legState(from, to, fresh(q), settled.has(q))}
                width={2.5}
              />
            );
          })}
        </svg>
        <ol className="relative flex flex-col">
          {steps.map((q, i) => {
            const state = states[i] ?? "ahead";
            const value = values[q];
            return (
              <li className="flex items-center gap-3.5" data-state={state} data-testid={TID.welcome.slot(q)} key={q} style={{ height: ROW }}>
                <Node appear={fresh(q)} state={state} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("flex items-center gap-2 text-small", state === "current" ? "font-semibold text-fg" : "text-fg-3")}>
                    {getQuestion(q).slot}
                    {value && fromCv?.has(q) ? (
                      <span className="rounded-full border border-border px-2 text-caption leading-5 text-fg-2" data-testid={`welcome-slot-cv-${q}`}>
                        من سيرتك
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 text-title leading-7 text-fg" data-welcome-answer={value ? q : undefined}>
                    {value ? (
                      <Roll className="max-w-full" id={value}>
                        <span className="truncate">{value}</span>
                      </Roll>
                    ) : state === "current" ? (
                      // the blank «دليلك» is asking you to fill now
                      <span aria-hidden className="block h-7 w-28 border-b-2 border-dotted border-border-strong" />
                    ) : (
                      <span aria-hidden className="block h-7" />
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      </div>
      <div className="border-t border-border px-card py-3">
        <RewardRow>
          <RewardChip land={complete && !completeOnArrival} status={complete ? "earned" : "offer"} value={XP.onboarding_completed} />
        </RewardRow>
      </div>
    </Tile>
  );
}

// ------------------------------------------------------------------------------------------------ phone: the row

export function ProfileRow({ values, pending, steps = ASKED_STEP_IDS }: ProfileTrailProps) {
  const { fresh, settled, settle } = useFreshFills(values, steps);
  const states = steps.map((q) => stateOf(q, values, pending));
  const box = useRef<HTMLOListElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  const col = width / steps.length;
  // physical x of station k (RTL: the first question sits at the right)
  const xOf = (k: number) => width - col * (k + 0.5);
  const NODE_ROW = 20;

  return (
    <div aria-label={CHAT_COPY.profileCard} className="relative" role="group">
      {width > 0 ? (
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 overflow-visible" height={NODE_ROW} width={width}>
          {steps.slice(1).map((q, i) => {
            const from = states[i] ?? "ahead";
            const to = states[i + 1] ?? "ahead";
            return (
              <Edge
                d={`M ${xOf(i) - NODE_ROW / 2 - 4} ${NODE_ROW / 2} L ${xOf(i + 1) + NODE_ROW / 2 + 4} ${NODE_ROW / 2}`}
                delay={0.05}
                key={q}
                onDrawn={() => settle(q)}
                state={legState(from, to, fresh(q), settled.has(q))}
                width={2.25}
              />
            );
          })}
        </svg>
      ) : null}
      {/* one column per step that applies (six, or seven with «مجالك»), so the legs above meet the stations */}
      <ol className="relative grid" ref={box} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((q, i) => {
          const state = states[i] ?? "ahead";
          return (
            <li className="flex flex-col items-center gap-1" data-state={state} data-testid={TID.welcome.slot(q)} key={q}>
              <span className="flex" data-welcome-answer={values[q] ? q : undefined}>
                <Node appear={fresh(q)} size={NODE_ROW} state={state} />
              </span>
              <span className={cn("text-[0.6875rem] leading-5 whitespace-nowrap", state === "ahead" ? "text-fg-3" : "font-semibold text-fg")}>{getQuestion(q).slot}</span>
              {values[q] ? <span className="sr-only">{values[q]}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
