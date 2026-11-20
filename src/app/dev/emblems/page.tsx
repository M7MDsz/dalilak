"use client";

// /dev/emblems: the twelve badge emblems (earned and locked) and the seven level emblems (development gallery).
import type { CSSProperties, ReactNode } from "react";

import { BADGE_IDS, BADGE_NAMES, BadgeEmblem, type Level, LEVEL_TITLES, LevelEmblem } from "@/components/emblems";
import { IconWarning, IconXp } from "@/components/icons";
import { BadgeMedal } from "@/components/ui";

type Surface = "paper" | "stage";
const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7];

function Board({ surface, label, children }: { readonly surface: Surface; readonly label: string; readonly children: ReactNode }) {
  const stage = surface === "stage";
  return (
    <div
      className={`rounded-xl px-6 pb-6 pt-5 ${stage ? "bg-stage text-on-stage" : "border border-line bg-sheet text-ink"}`}
      data-surface={stage ? "stage" : "paper"}
    >
      <p className={`mb-5 text-[13px] font-medium ${stage ? "text-on-stage-3" : "text-ink-3"}`} dir="ltr">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Bare emblems with light ink on the stage need a dark enamel (inside a medal the ink is navy and the enamel stays white). */
const darkEnamel = { "--emblem-enamel": "var(--color-stage-2)" } as CSSProperties;

function H2({ children }: { readonly children: ReactNode }) {
  return (
    <h2 className="mb-4 mt-12 text-xl font-bold" dir="ltr">
      {children}
    </h2>
  );
}

export default function EmblemsGallery() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-12">
      <header dir="ltr">
        <p className="text-[13px] font-semibold text-ink-3">Dalilak · emblems · /dev/emblems</p>
        <h1 className="mt-1 text-3xl font-bold">Badge emblems (12, earned and locked) and level emblems (7)</h1>
        <p className="mt-2 max-w-4xl text-[15px] text-ink-2">
          32 grid, the icon family&apos;s round line, one waypoint each, always at the end of a line or in a line&apos;s opening.
          The earned medal is brass, so an emblem carries no brass: ink line, one solid ink shape (the reward), white enamel
          areas, the accent waypoint. Locked: the same drawing as bare line, the trail dotted, the waypoint an empty ring. Bare
          on the stage (light ink), --emblem-enamel is set to stage-2. Levels: the solid ink rises a sixth of the mountain per
          level, the scale bar counts the level (from the right), the waypoint climbs the right flank.
        </p>
      </header>

      <H2>Badges in the design system&apos;s BadgeMedal (lg 112, emblem 52 px)</H2>
      {(["paper", "stage"] as const).map((s) => (
        <div className="mb-4" key={s}>
          <Board label={`${s} · earned, then locked`} surface={s}>
            <div className="grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {BADGE_IDS.map((id) => (
                <div className="flex items-start justify-center gap-1" key={id}>
                  <BadgeMedal emblem={(locked) => <BadgeEmblem id={id} locked={locked} size={52} />} name={BADGE_NAMES[id]} size="lg" />
                  <BadgeMedal bare emblem={(locked) => <BadgeEmblem id={id} locked={locked} size={37} />} size="md" state="locked" />
                </div>
              ))}
            </div>
          </Board>
        </div>
      ))}

      <H2>Small medals with no size passed (md 80 → 37 px box, sm 56 → 26 px box): the emblem shrinks to fit</H2>
      <Board label="paper · md then sm, earned · the streak pair and the level badge are the ones to compare" surface="paper">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          {BADGE_IDS.map((id) => (
            <div className="flex flex-col items-center gap-1" key={id}>
              <div className="flex items-end gap-1.5">
                <BadgeMedal bare emblem={<BadgeEmblem id={id} />} size="md" />
                <BadgeMedal bare emblem={<BadgeEmblem id={id} />} size="sm" />
              </div>
              <p className="text-[13px] font-semibold text-ink">{BADGE_NAMES[id]}</p>
            </div>
          ))}
        </div>
      </Board>

      <H2>Badges, bare · 64 px and 32 px, earned and locked</H2>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["paper", "stage"] as const).map((s) => (
          <Board key={s} label={`${s} · each cell: 64 earned, 64 locked, 32 earned, 32 locked`} surface={s}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-3" style={s === "stage" ? darkEnamel : undefined}>
              {BADGE_IDS.map((id) => (
                <div className="flex flex-col items-center gap-1.5" key={id}>
                  <div className="flex items-end gap-2">
                    <BadgeEmblem id={id} size={64} />
                    <span className={s === "stage" ? "text-on-stage-3" : "text-ink-3"}>
                      <BadgeEmblem id={id} locked size={64} />
                    </span>
                    <BadgeEmblem id={id} size={32} />
                    <span className={s === "stage" ? "text-on-stage-3" : "text-ink-3"}>
                      <BadgeEmblem id={id} locked size={32} />
                    </span>
                  </div>
                  <p className={`text-[14px] font-semibold ${s === "stage" ? "text-on-stage" : "text-ink"}`}>{BADGE_NAMES[id]}</p>
                </div>
              ))}
            </div>
          </Board>
        ))}
      </div>

      <H2>Levels · from the trailhead (1) to the summit (7)</H2>
      {(["paper", "stage"] as const).map((s) => (
        <div className="mb-4" key={s}>
          <Board label={`${s} · in BadgeMedal lg, then bare at 64 and 32`} surface={s}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {LEVELS.map((l) => (
                <div className="flex flex-col items-center gap-3" key={l}>
                  <BadgeMedal bare emblem={<LevelEmblem level={l} size={52} />} size="lg" />
                  <div className="flex items-end gap-3" style={s === "stage" ? darkEnamel : undefined}>
                    <LevelEmblem level={l} size={64} />
                    <LevelEmblem level={l} size={32} />
                  </div>
                  <p className={`text-[15px] font-semibold ${s === "stage" ? "text-on-stage" : "text-ink"}`}>{`${l} · ${LEVEL_TITLES[l]}`}</p>
                </div>
              ))}
            </div>
          </Board>
        </div>
      ))}

      <H2>Levels in one row · 32 px bare and in the sm medal, beside IconWarning and IconXp (no warning-sign read)</H2>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["paper", "stage"] as const).map((s) => (
          <Board key={s} label={`${s} · 1 → 7 at 32 px, then in BadgeMedal sm · far end: IconWarning, IconXp at 32`} surface={s}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3" style={s === "stage" ? darkEnamel : undefined}>
                {LEVELS.map((l) => (
                  <LevelEmblem key={l} level={l} size={32} />
                ))}
                <span className="mx-1 h-8 w-px bg-current opacity-25" />
                <IconWarning size={32} />
                <IconXp size={32} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {LEVELS.map((l) => (
                  <BadgeMedal bare emblem={<LevelEmblem level={l} />} key={l} size="sm" />
                ))}
              </div>
            </div>
          </Board>
        ))}
      </div>

      <H2>Drawing check · 128 px on paper</H2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {BADGE_IDS.map((id) => (
          <div className="grid place-items-center rounded-xl bg-paper py-4" key={id}>
            <BadgeEmblem id={id} size={128} />
          </div>
        ))}
        {LEVELS.map((l) => (
          <div className="grid place-items-center rounded-xl bg-paper py-4" key={`l${l}`}>
            <LevelEmblem level={l} size={128} />
          </div>
        ))}
      </div>
    </main>
  );
}
