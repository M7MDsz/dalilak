"use client";
// The player's HUD (docs/GAME-LAYER.md 4.6): who you are in the game, at a glance. Level token, the segmented XP track (it
// fills in counted steps while the number counts: the XP landing), the streak, the rank. PlayerChip is the top-bar chip
// (spec 2.7); PlayerCard the bigger plate for the home column and the profile; StatTile one number with its label.
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Avatar, type AvatarId } from "@/components/avatars";
import { IconBadge, IconGift, IconLeaderboard, IconStreak } from "@/components/icons";
import { NumberTicker, Roll, useInstant } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";

import { Segments } from "./meter";
import { Tile, type TileProps } from "./tile";

// ---------------------------------------------------------------------------------------------------------------------
// LevelToken: the level as a chunky ink token with its numeral (levels are ink, never brass). The numeral rolls on a level-up.

const TOKEN = { sm: "size-6 rounded-[0.4375rem] text-small", md: "size-8 rounded-[0.5625rem] text-title", lg: "size-11 rounded-[0.75rem] text-h3" } as const;

export function LevelToken({
  level,
  size = "md",
  className,
  testId,
  value,
}: {
  readonly level: number;
  readonly size?: keyof typeof TOKEN;
  readonly className?: string;
  readonly testId?: string;
  /** data-value, when the shown level lags a level-up (the final level from the first frame). Default `level`. */
  readonly value?: number;
}) {
  return (
    <span
      aria-label={`المستوى ${level}`}
      className={cn("relative inline-grid shrink-0 place-items-center bg-solid font-bold leading-none text-on-solid tabular-nums", TOKEN[size], className)}
      data-testid={testId}
      data-value={value ?? level}
      dir="ltr"
      role="img"
    >
      {/* one inner hairline: a struck token, flat colour */}
      <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[inherit] border border-on-solid/25" />
      <Roll id={level}>{formatNumber(level)}</Roll>
    </span>
  );
}

/** How long an XpTrack takes to finish the old sheet on a level-up (the level token and title swap after it: spec 2.7). */
function levelUpMs(segments: number): number {
  return segments * 70 + 260;
}

/**
 * The level shown next to a track lags a level-up until the old sheet has filled ("on a level change the title swaps after
 * the bar reaches the end", spec 2.7). A drop or an instant context swaps at once.
 */
export function useShownLevel<T>(value: T, level: number, segments = 10): T {
  const instant = useInstant();
  const [shown, setShown] = useState(value);
  const shownLevel = useRef(level);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (instant || level <= shownLevel.current) {
      shownLevel.current = level;
      setShown(latest.current);
      return;
    }
    const timer = window.setTimeout(() => {
      shownLevel.current = level;
      setShown(latest.current);
    }, levelUpMs(segments));
    return () => window.clearTimeout(timer);
  }, [level, instant, segments]);
  if (instant || level === shownLevel.current) return value;
  return shown;
}

// ---------------------------------------------------------------------------------------------------------------------
// XpTrack: the level progress as brass segments. A gain fills the segments one after another while the number counts; a
// level-up fills the old sheet to its end, then the new level's sheet starts empty (a cut, never an un-draw).

export interface XpTrackProps {
  /** Total XP. */
  readonly total: number;
  /** This level's threshold (150 for level 2). */
  readonly from: number;
  /** The next threshold (350); null at level 7. */
  readonly to: number | null;
  readonly level?: number;
  /** The level title («مستكشف»): writes «المستوى 2 · مستكشف» above the track (md). */
  readonly title?: string;
  /** The next level's title, for «بقي 170 XP للمستوى 3 «مجتهد»». */
  readonly nextTitle?: string;
  readonly showRemaining?: boolean;
  readonly segments?: number;
  /** sm: one line, a thin track (the top-bar chip) · md: the header, a chunky track, the remaining line */
  readonly size?: "sm" | "md";
  readonly className?: string;
  readonly testId?: string;
}

interface TrackView {
  readonly total: number;
  readonly from: number;
  readonly to: number | null;
  readonly level?: number;
}

function fillsOf(v: TrackView, segments: number): number[] {
  if (v.to === null || v.to <= v.from) return Array.from({ length: segments }, () => 1);
  const filled = Math.max(0, Math.min(1, (v.total - v.from) / (v.to - v.from))) * segments;
  return Array.from({ length: segments }, (_, i) => Math.max(0, Math.min(1, filled - i)));
}

export function XpTrack({ total, from, to, level, title, nextTitle, showRemaining = false, segments = 10, size = "md", className, testId }: XpTrackProps) {
  const instant = useInstant();
  const [view, setView] = useState<TrackView>({ total, from, to, level });
  const shownFrom = useRef(from);

  useEffect(() => {
    const next = { total, from, to, level };
    if (instant || from <= shownFrom.current) {
      shownFrom.current = from;
      setView(next);
      return;
    }
    // a level-up: 1. finish the old sheet, 2. cut to a fresh sheet at the new threshold, 3. fill it
    setView((v) => ({ ...v, total: v.to ?? v.total }));
    let inner = 0;
    const outer = window.setTimeout(() => {
      shownFrom.current = from;
      setView({ ...next, total: from });
      inner = window.setTimeout(() => setView(next), 80);
    }, levelUpMs(segments));
    return () => {
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
  }, [total, from, to, level, instant, segments]);

  const fills = fillsOf(view, segments);
  const remaining = to === null ? 0 : Math.max(0, to - total);
  const numbers = (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap font-bold tabular-nums" dir="ltr">
      <span className="text-xp-fg">
        <NumberTicker value={total} />
      </span>
      {view.to !== null ? <span className="font-semibold text-fg-3">/ {formatNumber(view.to)} XP</span> : <span className="font-semibold text-fg-3">XP</span>}
    </span>
  );

  if (size === "sm") {
    return (
      <span className={cn("flex min-w-0 flex-col gap-1", className)} data-testid={testId} data-value={total}>
        <span className="text-caption">{numbers}</span>
        <Segments fills={fills} gap={2} height="xs" tone="xp" />
      </span>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)} data-testid={testId} data-value={total}>
      <div className="flex items-baseline justify-between gap-3">
        {title ? (
          <span className="text-small font-semibold text-fg">
            المستوى {level !== undefined ? formatNumber(level) : ""} · {title}
          </span>
        ) : (
          <span />
        )}
        <span className="text-small">{numbers}</span>
      </div>
      <Segments fills={fills} gap={3} height="lg" tone="xp" />
      {showRemaining ? (
        <p className="text-small text-fg-2">
          {to === null ? (
            "بلغت أعلى مستوى"
          ) : (
            <>
              بقي{" "}
              <bdi className="font-semibold text-xp-fg tabular-nums" dir="ltr">
                {formatNumber(remaining)} XP
              </bdi>{" "}
              للمستوى {level !== undefined ? formatNumber(level + 1) : ""}
              {nextTitle ? ` «${nextTitle}»` : ""}
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// StreakCount: the campfire and the number of days (the number rolls).

export function StreakCount({ days, size = "md", label, className, testId }: { readonly days: number; readonly size?: "sm" | "md"; readonly label?: ReactNode; readonly className?: string; readonly testId?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-bold tabular-nums text-fg", size === "sm" ? "text-small" : "text-title", className)} data-testid={testId} data-value={days}>
      <IconStreak className="text-fg" size={size === "sm" ? 18 : 22} waypoint="muted" />
      <Roll id={days}>{formatNumber(days)}</Roll>
      {label ? <span className="text-small font-medium text-fg-2">{label}</span> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// PlayerChip: the top-bar chip of spec 2.7 as a HUD plate. Pressable (it opens /profile), so it sits on a plinth.

export interface PlayerChipProps extends Omit<TileProps, "children" | "state" | "ribbon"> {
  readonly name: string;
  readonly avatar: AvatarId | (string & {});
  readonly level: number;
  readonly title: string;
  readonly total: number;
  readonly from: number;
  readonly to: number | null;
  readonly streak: number;
  /** Phone form: avatar · level · XP total · streak. */
  readonly compact?: boolean;
  /** Accepted and ignored (so a level record can be spread in). */
  readonly nextTitle?: string;
  /** Test ids of spec 2.7: { chip: "shell-user-chip", level: "shell-level", xp: "shell-xp", streak: "shell-streak" }. */
  readonly testIds?: { readonly chip?: string; readonly level?: string; readonly xp?: string; readonly streak?: string };
}

export function PlayerChip({ name, avatar, level: levelNow, title: titleNow, total, from, to, streak, compact = false, testIds, faceClassName, className, nextTitle: _nextTitle, ...rest }: PlayerChipProps) {
  const { level, title } = useShownLevel({ level: levelNow, title: titleNow }, levelNow, 8);
  if (compact) {
    return (
      <Tile {...rest} className={cn("w-fit", className)} data-testid={testIds?.chip} depth="sm" faceClassName={cn("h-11 flex-row items-center gap-2 ps-1 pe-3", faceClassName)} radius="full">
        <Avatar id={avatar} size={34} />
        <LevelToken level={level} size="sm" testId={testIds?.level} value={levelNow} />
        <span className="inline-flex items-center gap-1 text-small font-bold text-xp-fg tabular-nums" data-testid={testIds?.xp} data-value={total} dir="ltr">
          <NumberTicker value={total} /> XP
        </span>
        <span aria-hidden className="h-5 w-px bg-border" />
        <StreakCount days={streak} size="sm" testId={testIds?.streak} />
      </Tile>
    );
  }
  return (
    <Tile {...rest} className={cn("w-fit max-w-full", className)} data-testid={testIds?.chip} depth="sm" faceClassName={cn("min-h-14 flex-row items-center gap-3 py-2 ps-2 pe-4", faceClassName)} radius="control">
      <Avatar id={avatar} level={level} size={40} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-small font-semibold text-fg">{name}</span>
        <span className="flex items-center gap-1.5 text-caption text-fg-2">
          <LevelToken level={level} size="sm" testId={testIds?.level} value={levelNow} />
          <span className="whitespace-nowrap">{title}</span>
        </span>
      </span>
      <span aria-hidden className="h-8 w-px bg-border" />
      <XpTrack className="w-32" from={from} segments={8} size="sm" testId={testIds?.xp} to={to} total={total} />
      <span aria-hidden className="h-8 w-px bg-border" />
      <StreakCount days={streak} size="sm" testId={testIds?.streak} />
    </Tile>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// PlayerCard: the player plate (home column, profile hero). Flat unless you make it pressable (render / onClick).

export interface PlayerCardProps extends Omit<TileProps, "children" | "state" | "ribbon"> {
  readonly name: string;
  readonly avatar: AvatarId | (string & {});
  readonly level: number;
  readonly title: string;
  readonly nextTitle?: string;
  readonly total: number;
  readonly from: number;
  readonly to: number | null;
  readonly streak: number;
  /** This week's rank («المركز 18»). */
  readonly rank?: number;
  /** Badges earned and the total («3 من 12»). */
  readonly badges?: { readonly have: number; readonly total: number };
  /** Tomorrow's daily reward (spec 8.4), the one real reward still ahead today. */
  readonly nextReward?: number;
}

function HudStat({ icon, value, label, className }: { icon: ReactNode; value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-0.5 px-3 first:ps-0 last:pe-0", className)}>
      <span className="flex items-center gap-1.5 text-title font-bold text-fg tabular-nums">
        <span className="inline-flex shrink-0 text-fg-2">{icon}</span>
        {value}
      </span>
      <span className="truncate text-small text-fg-2">{label}</span>
    </span>
  );
}

export function PlayerCard({ name, avatar, level: levelNow, title: titleNow, nextTitle, total, from, to, streak, rank, badges, nextReward, faceClassName, interactive = false, ...rest }: PlayerCardProps) {
  const { level, title } = useShownLevel({ level: levelNow, title: titleNow }, levelNow);
  return (
    <Tile {...rest} faceClassName={cn("gap-4 p-card", faceClassName)} interactive={interactive}>
      <div className="flex items-center gap-3">
        <Avatar id={avatar} level={level} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-h3 text-fg">{name}</p>
          <p className="flex items-center gap-2 text-small text-fg-2">
            <LevelToken level={level} size="sm" />
            <span>
              المستوى {formatNumber(level)} · <span className="font-semibold text-fg">{title}</span>
            </span>
          </p>
        </div>
        {rank !== undefined ? (
          <span className="flex shrink-0 flex-col items-end gap-0.5 text-end">
            <span className="flex items-center gap-1 text-h3 font-bold text-fg tabular-nums" dir="ltr">
              <Roll id={rank}>{formatNumber(rank)}</Roll>
            </span>
            <span className="max-w-[5.5rem] text-caption leading-snug text-fg-2">مركزك هذا الأسبوع</span>
          </span>
        ) : null}
      </div>
      <XpTrack from={from} level={levelNow} nextTitle={nextTitle} showRemaining to={to} total={total} />
      <div className="flex border-t border-border pt-3 [&>*+*]:border-s [&>*+*]:border-border">
        <HudStat icon={<IconStreak size={20} waypoint="muted" />} label={streak === 1 ? "يوم متتالٍ" : "أيام متتالية"} value={<Roll id={streak}>{formatNumber(streak)}</Roll>} />
        {badges ? (
          <HudStat
            icon={<IconBadge size={20} waypoint="muted" />}
            label="شارات"
            value={
              <span dir="ltr">
                {formatNumber(badges.have)}
                <span className="text-small font-semibold text-fg-3"> / {formatNumber(badges.total)}</span>
              </span>
            }
          />
        ) : null}
        {nextReward !== undefined ? (
          <HudStat
            icon={<IconGift size={20} waypoint="muted" />}
            label="مكافأة الغد"
            value={
              <bdi className="text-xp-fg" dir="ltr">
                +{formatNumber(nextReward)} XP
              </bdi>
            }
          />
        ) : rank !== undefined ? null : (
          <HudStat icon={<IconLeaderboard size={20} waypoint="muted" />} label="المركز" value="—" />
        )}
      </div>
    </Tile>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// StatTile: one number with its label and icon (the profile's stats row). Flat: it is read, not pressed.

export interface StatTileProps {
  readonly icon: ReactNode;
  readonly label: ReactNode;
  readonly value: number;
  /** xp: the number is XP (brass numerals and «XP») */
  readonly tone?: "ink" | "xp";
  /** Count to the value when it changes. */
  readonly count?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

export function StatTile({ icon, label, value, tone = "ink", count = true, className, testId }: StatTileProps) {
  return (
    <Tile className={className} faceClassName="gap-2 p-4" interactive={false}>
      <span className="flex items-center gap-2 text-small font-medium text-fg-2">
        <span className="inline-grid size-8 shrink-0 place-items-center rounded-[0.5625rem] border-[1.5px] border-fg text-fg stage:border-on-stage-3">{icon}</span>
        {label}
      </span>
      <span className={cn("text-h2 font-bold tabular-nums", tone === "xp" ? "text-xp-fg" : "text-fg")} data-testid={testId} data-value={value} dir="ltr">
        {count ? <NumberTicker value={value} /> : formatNumber(value)}
        {tone === "xp" ? <span className="text-title"> XP</span> : null}
      </span>
    </Tile>
  );
}
