"use client";
// Owner: map. The cards under the map on narrow layouts: the branch cards (on a wide sheet the branches are the two peaks
// on the map) and the player plate (PlayerCard + DailyTrack, GAME-LAYER 5.2 item 3). The next-step card, the target card
// and the leaderboard preview that stood beside the map were removed on 20 Nov (owner): the real jobs and what is left
// to reach each one take their place (job-cards.tsx). Nothing here pays XP.
import { type AvatarId } from "@/components/avatars";
import { DailyTrack, dailyDays, PlayerCard, Tile } from "@/components/game";
import { buttonStyles, cn } from "@/components/ui";
import { getJob, getLevel } from "@/lib/data";
import { levelFor } from "@/lib/engine";
import { formatPercent } from "@/lib/format";
import { TID } from "@/lib/testids";
import type { JobId, LevelNumber, Roadmap } from "@/lib/types";

// ── branches (narrow layouts) ────────────────────────────────────────────────────────────────────────────────────────

export function BranchCards({ branches, complete, onBranch }: { readonly branches: Roadmap["branches"]; readonly complete: boolean; readonly onBranch: (jobId: JobId) => void }) {
  return (
    <section aria-labelledby="path-branches" className="flex flex-col gap-2.5">
      <h2 className="text-title text-fg" id="path-branches">
        فروع تُفتح بعد هذا المسار
      </h2>
      {branches.map((b) => (
        <button
          className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-start transition-[border-color,scale] duration-200 ease-out hover:border-border-strong active:scale-[0.99] active:transition-none"
          data-testid={TID.path.branch(b.jobId)}
          data-value={b.after}
          key={b.jobId}
          onClick={() => onBranch(b.jobId)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-title text-fg">{getJob(b.jobId).title}</span>
            <span className="flex items-center gap-2 text-small text-fg-2">
              <span>
                الآن <bdi dir="ltr">{formatPercent(b.now)}</bdi>
              </span>
              <span aria-hidden className="size-[3px] rounded-full bg-fg-3" />
              <span>
                بعد المسار <bdi dir="ltr">{formatPercent(b.after)}</bdi>
              </span>
            </span>
          </span>
          <span className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "pointer-events-none shrink-0")}>{complete ? "اجعلها هدفي" : "عرض الوظيفة"}</span>
        </button>
      ))}
    </section>
  );
}

// ── the player ───────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PlayerFacts {
  readonly name: string;
  readonly avatar: AvatarId;
  /** Total XP (the level, its title and the track come from it, spec 8.3). */
  readonly total: number;
  readonly streak: number;
  readonly badges: { readonly have: number; readonly total: number };
  /** Tomorrow's daily reward if the streak continues (spec 8.4). */
  readonly tomorrow: number;
  /** Today needs no claim: claimed already, or the creation day (no reward then, spec 8.4). */
  readonly todayDone: boolean;
}

/**
 * The player plate (GAME-LAYER 5.2 item 3): PlayerCard (the level token, the XP track with what is left, the streak, the
 * badges «3 / 12», tomorrow's reward) and, under it, the streak as a track of daily coins. The rank is left to the
 * leaderboard preview right under it (its «أنت» row): in the 340 px column a rank cell would also squeeze the level line
 * into two. `track: false` leaves the track out (the PlayerCard already names tomorrow's reward).
 */
export function PlayerPanel({ player, track = true, className }: { readonly player: PlayerFacts; readonly track?: boolean; readonly className?: string }) {
  const info = levelFor(player.total);
  const nextTitle = info.next === null ? undefined : getLevel((info.level + 1) as LevelNumber).title;
  return (
    <section aria-label="ملفك" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <PlayerCard
        avatar={player.avatar}
        badges={player.badges}
        from={info.from}
        level={info.level}
        name={player.name}
        nextReward={player.tomorrow}
        nextTitle={nextTitle}
        streak={player.streak}
        title={info.title}
        to={info.next}
        total={player.total}
      />
      {track ? (
        <Tile faceClassName="gap-3 px-4 pt-3 pb-3.5" interactive={false}>
          <h2 className="text-small font-semibold text-fg">سلسلة الأيام</h2>
          <DailyTrack days={dailyDays(player.streak, player.todayDone)} />
        </Tile>
      ) : null}
    </section>
  );
}
