"use client";
// Owner: profile. The identity band of spec 3.13 as the player plate (docs/GAME-LAYER.md 5.8): the avatar (with its level
// ring) and «غيّر الصورة», the name, the level token with «المستوى 3 · مجتهد», the XP line «420 من 600 XP» (level 7:
// «بلغت أعلى مستوى») with «XP = نقاط الخبرة», and the brass XP track in segments with what is left to the next level.
// Under the plate the stats row as five StatTiles: «XP» (brass) · «خطوات التعلّم المنجزة» · «النجوم» · «سلسلة الأيام» ·
// «ترتيب الأسبوع». Plate and tiles are flat ink pieces (`interactive={false}`): they are read, not pressed; the only
// pressable thing here is the avatar button.
// The plate sits on a faint contour map whose summit is the avatar: the user is the high point of their own page.
// avatar-swap (playbook 3.11): when the picker saves, the old drawing leaves and the new one arrives in place (scale 0.9
// and 2 px of blur, 200 ms). Numbers roll and XP counts, and the track's segments fill one after another, only if they
// change while the page is open (the daily reward).
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { LevelToken, StatTile, Tile, XpTrack } from "@/components/game";
import { IconCourses, IconEdit, IconLeaderboard, IconStar, IconStreak, IconXp } from "@/components/icons";
import { NumberTicker, Roll } from "@/components/motion";
import { Button, ContourBackdrop, XpGlyph, cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { tween } from "@/lib/motion";
import { TID } from "@/lib/testids";
import type { LevelInfo, UserState } from "@/lib/types";

import { PROFILE_COPY, levelLine } from "./copy";

export interface ProfileStats {
  readonly xp: number;
  readonly courses: number;
  readonly stars: number;
  readonly streak: number;
  readonly rank: number;
}

export function Identity({
  user,
  level,
  nextTitle,
  stats,
  onChangeAvatar,
}: {
  readonly user: UserState;
  readonly level: LevelInfo;
  readonly nextTitle: string | undefined;
  readonly stats: ProfileStats;
  readonly onChangeAvatar: () => void;
}): ReactNode {
  const top = level.next === null;
  return (
    <section aria-labelledby="profile-name" className="flex flex-col gap-4">
      <Tile faceClassName="isolate overflow-hidden" interactive={false}>
        <ContourBackdrop className="hidden @min-[640px]/content:block" intensity="faint" rings={14} seed={7} summit={{ x: 0.9, y: 0.36 }} />

        {/* One grid, two arrangements, the spec's reading order in the DOM (avatar, its button, name and level, the bar).
            Phone: the avatar beside the name, the button under them, the bar across. Wide: the avatar and its button in a
            column at the inline-start, the name, the level and the bar beside them. */}
        <div
          className={cn(
            "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-5 p-card",
            "[grid-template-areas:'avatar_head'_'button_button'_'bar_bar']",
            "@min-[640px]/content:gap-x-10 @min-[640px]/content:gap-y-4 @min-[640px]/content:p-8",
            "@min-[640px]/content:[grid-template-areas:'avatar_head'_'avatar_bar'_'button_bar']",
          )}
        >
          <span className="relative grid size-[5.5rem] place-items-center [grid-area:avatar] @min-[640px]/content:size-32 @min-[640px]/content:self-start" data-testid={TID.profile.avatar} data-value={user.avatar}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                className="grid size-full place-items-center"
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)", transition: tween.exit }}
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                key={user.avatar}
                transition={tween.fast}
              >
                <Avatar className="size-full! [&_svg]:size-full" id={user.avatar} level={level.level} size={128} title={user.name} />
              </motion.span>
            </AnimatePresence>
          </span>

          <Button
            className="justify-self-start [grid-area:button] @min-[640px]/content:self-start @min-[640px]/content:justify-self-center"
            data-testid={TID.profile.avatarOpen}
            icon={<IconEdit size={18} />}
            onClick={onChangeAvatar}
            size="sm"
            variant="secondary"
          >
            {PROFILE_COPY.changeAvatar}
          </Button>

          <div className="flex min-w-0 flex-col gap-1.5 [grid-area:head] @min-[640px]/content:self-end">
            <NameAndLevel level={level} name={user.name} />
          </div>

          <div className="flex min-w-0 max-w-[44rem] flex-col gap-2.5 [grid-area:bar] @min-[640px]/content:self-start">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              {top ? (
                <span className="text-title text-fg">{PROFILE_COPY.topLevel}</span>
              ) : (
                <span className="inline-flex items-baseline gap-1.5 text-title font-semibold text-fg-2">
                  <bdi className="inline-flex items-center gap-1 text-h3 font-bold text-xp-fg tabular-nums" dir="ltr">
                    <XpGlyph className="self-center" size={22} />
                    <NumberTicker value={stats.xp} />
                  </bdi>
                  <span>من</span>
                  <bdi className="tabular-nums" dir="ltr">
                    {formatNumber(level.next ?? stats.xp)} XP
                  </bdi>
                </span>
              )}
              <span className="text-small text-fg-3">
                <bdi dir="ltr">XP</bdi> = {PROFILE_COPY.xpNote}
              </span>
            </p>
            {/* The game layer's XP track: brass segments that fill one after another when XP lands, and what is left to
                the next level. Its own number line is hidden: this page writes the spec's words above it. */}
            <div className="flex items-start gap-3">
              <XpTrack
                className="flex-1 [&>div:first-child]:hidden"
                from={level.from}
                level={level.level}
                nextTitle={nextTitle}
                showRemaining={!top}
                testId={TID.profile.xp}
                to={level.next}
                total={stats.xp}
              />
              {/* where the track leads: the next level's token, still locked (a dashed well), centred on the segments */}
              {top ? null : <NextLevelToken level={level.level + 1} />}
            </div>
          </div>
        </div>
      </Tile>

      <StatsRow stats={stats} />
    </section>
  );
}

function NameAndLevel({ name, level }: { readonly name: string; readonly level: LevelInfo }): ReactNode {
  return (
    <>
      <p className="text-h2 leading-tight text-fg @min-[640px]/content:text-h1 @min-[640px]/content:leading-tight" id="profile-name">
        {name}
      </p>
      <p className="flex items-center gap-2.5">
        {/* the level as the game's ink token (levels are ink, never brass); its numeral rolls on a level-up */}
        <LevelToken level={level.level} size="md" />
        <span className="text-title text-fg-2" data-testid={TID.profile.level} data-value={level.level}>
          <Roll id={level.level}>{levelLine(level.level, level.title)}</Roll>
        </span>
      </p>
    </>
  );
}

/**
 * The next level at the end of the XP track, in the game's locked state (GAME-LAYER 3: a dashed well, readable numeral):
 * the LevelToken's shape, not yet struck. The track is 14 px high, the token 32: -9 px centres it on the segments.
 */
function NextLevelToken({ level }: { readonly level: number }): ReactNode {
  return (
    <span
      aria-label={`المستوى ${formatNumber(level)}`}
      className="-mt-[9px] inline-grid size-8 shrink-0 place-items-center rounded-[0.5625rem] border-2 border-dashed border-border-strong bg-surface-2 text-title font-bold leading-none text-fg-2 tabular-nums"
      dir="ltr"
      role="img"
    >
      {formatNumber(level)}
    </span>
  );
}

/** «XP» 420 · «خطوات التعلّم المنجزة» 1 · «النجوم» 12 · «سلسلة الأيام» 1 · «ترتيب الأسبوع» 10: five flat StatTiles. */
function StatsRow({ stats }: { readonly stats: ProfileStats }): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 @min-[820px]/content:grid-cols-5 @min-[820px]/content:gap-4">
      {/* XP takes the whole first row on a phone: there it lies along the row (label at the start, the number at the end) */}
      <StatTile
        className="col-span-2 @max-[820px]/content:[&>*]:flex-row @max-[820px]/content:[&>*]:items-center @max-[820px]/content:[&>*]:justify-between @min-[820px]/content:col-span-1"
        icon={<IconXp size={20} waypoint="muted" />} label={PROFILE_COPY.stats.xp} tone="xp" value={stats.xp} />
      <StatTile icon={<IconCourses size={20} waypoint="muted" />} label={PROFILE_COPY.stats.courses} testId={TID.profile.stat("courses")} value={stats.courses} />
      <StatTile icon={<IconStar size={20} waypoint="muted" />} label={PROFILE_COPY.stats.stars} testId={TID.profile.stat("stars")} value={stats.stars} />
      <StatTile icon={<IconStreak size={20} waypoint="muted" />} label={PROFILE_COPY.stats.streak} testId={TID.profile.stat("streak")} value={stats.streak} />
      <StatTile icon={<IconLeaderboard size={20} waypoint="muted" />} label={PROFILE_COPY.stats.rank} testId={TID.profile.stat("rank")} value={stats.rank} />
    </div>
  );
}
