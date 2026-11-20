"use client";
// Owner: profile. `/profile` (spec 3.13): the user's identity in the game. The DOM follows the spec's table order, which
// is the phone's one column: heading «ملفي» (lg:sr-only, the desktop top bar shows it, ARCH 11.1) · identity and stats ·
// «الشارات» · «سلسلة الأيام» · «سجل النقاط» · «معلوماتي» · «عن هذا العرض» · the account row.
// From 900 px of content width the same order lays out on the Darb grid (the 340 px column at the inline-start, the wide
// column beside it): identity and badges across; streak beside the history; answers beside «عن هذا العرض» and the
// account row. Normal state only (local data); no XP is paid here.
// Three things move, each once, each only when something changed (playbook 3.11): badges unlocked since the last visit
// turn over, the avatar swaps when the picker saves, a row earned while the page is open joins the history.
import { useState, type ReactNode } from "react";

import { PageTransition } from "@/components/motion";
import { ThemePicker } from "@/features/shared";
import { getLevel } from "@/lib/data";
import { dailyReward, leaderboard, levelFor, skillStars, streakInfo, totalStars, totalXp } from "@/lib/engine";
import { useClock, useCurrentUser } from "@/lib/store";
import type { LevelNumber } from "@/lib/types";

import { AccountRow } from "./account";
import { AboutSection, AnswersSection } from "./answers";
import { AvatarPicker } from "./avatar-picker";
import { BadgesSection } from "./badges";
import { PROFILE_COPY } from "./copy";
import { HistorySection } from "./history";
import { Identity } from "./identity";
import { StreakSection } from "./streak";

export function ProfileScreen(): ReactNode {
  const user = useCurrentUser();
  const clock = useClock();
  const [picking, setPicking] = useState(false);
  if (!user) return null; // the Guard renders nothing once signed out; children may assume a user

  const xp = totalXp(user);
  const level = levelFor(xp);
  const nextTitle = level.level < 7 ? getLevel((level.level + 1) as LevelNumber).title : undefined;
  const streak = streakInfo(user, clock);
  const stats = {
    xp,
    courses: Object.values(user.courses).filter((course) => course !== undefined && course.completedAt !== null).length,
    stars: totalStars(skillStars(user)),
    streak: streak.current,
    rank: leaderboard(user, clock).me.rank,
  };

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[72rem] flex-col gap-5 px-gutter pt-6 pb-12 @min-[900px]/content:pt-2 lg:pb-28">
        <h1 className="text-h1 text-fg lg:sr-only">{PROFILE_COPY.heading}</h1>

        {/* Phone: one column in the DOM order. From 900 px of content: the wide column at the inline-start (the right),
            the 340 px column beside it; `dense` lets a wide card take the row of the narrow card written before it, so
            the DOM keeps the spec's order while the rows pair up: history beside the streak, answers beside «عن هذا
            العرض». Paired cards stretch to one height. */}
        <div className="grid gap-5 @min-[900px]/content:grid-flow-dense @min-[900px]/content:grid-cols-[minmax(0,1fr)_21.25rem] @min-[900px]/content:items-start @min-[900px]/content:gap-6">
          <div className="@min-[900px]/content:col-span-2">
            <Identity level={level} nextTitle={nextTitle} onChangeAvatar={() => setPicking(true)} stats={stats} user={user} />
          </div>
          <div className="@min-[900px]/content:col-span-2">
            <BadgesSection user={user} />
          </div>
          <StreakSection className="@min-[900px]/content:col-start-2 @min-[900px]/content:self-stretch" daily={dailyReward(user, clock)} firstDay={user.createdDay === clock.today} streak={streak} />
          <HistorySection className="@min-[900px]/content:col-start-1 @min-[900px]/content:self-stretch" clock={clock} events={user.xpEvents} />
          <AnswersSection className="@min-[900px]/content:col-start-1 @min-[900px]/content:self-stretch" user={user} />
          <AboutSection className="@min-[900px]/content:col-start-2 @min-[900px]/content:self-stretch" />
          {/* the design switch: «هادئ» (Darb) or «لعبة» (Lawha), src/features/shared/theme-switch.tsx */}
          <ThemePicker className="@min-[900px]/content:col-span-2" />
          <AccountRow className="px-1 pt-1 @min-[900px]/content:col-span-2" name={user.name} />
        </div>
      </main>
      <AvatarPicker current={user.avatar} onOpenChange={setPicking} open={picking} />
    </PageTransition>
  );
}
