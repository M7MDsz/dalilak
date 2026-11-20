// Owner: leaderboard. The gap line drawn as a short stretch of trail (Darb's progress grammar: solid line, waypoint,
// dotted line). It spans the XP from the place behind the user (the start of the line) to the person one place ahead
// (their avatar at the end); the user's waypoint stands where their XP puts them, so the dotted part ahead IS the gap of
// «يفصلك 20 XP عن المركز 9». Drawn from the board's own numbers; decoration only for screen readers (the sentence says it).
import type { CSSProperties, ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import type { LeaderRow } from "@/lib/types";

export function GapTrail({ behindXp, mine, ahead }: { readonly behindXp: number; readonly mine: number; readonly ahead: LeaderRow }): ReactNode {
  const span = Math.max(1, ahead.weeklyXp - behindXp);
  // keep the waypoint clear of both ends, so the solid and the dotted parts both read
  const at = Math.max(0.12, Math.min(0.88, (mine - behindXp) / span));
  return (
    <div aria-hidden className="flex items-center gap-2">
      <div className="relative h-5 flex-1" style={{ "--at": `${at * 100}%` } as CSSProperties}>
        {/* covered: from the place behind to the user */}
        <span className="absolute inset-y-0 start-0 my-auto h-0.5 w-(--at) rounded-full bg-fg" />
        {/* ahead: the dotted trail to the next place */}
        <span className="absolute inset-y-0 end-0 my-auto h-0 border-t-2 border-dotted border-border-strong" style={{ insetInlineStart: "var(--at)" }} />
        {/* you: the waypoint, with a cut in the card's colour around it */}
        <span
          className="absolute inset-y-0 my-auto -ms-1.75 size-3.5 rounded-full bg-accent ring-[3px] ring-surface"
          style={{ insetInlineStart: "var(--at)" }}
        />
      </div>
      <Avatar id={ahead.avatar} level={ahead.level} size={32} />
    </div>
  );
}
