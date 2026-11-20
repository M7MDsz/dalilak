"use client";
// Piece 2 (spec 3.1): the match ring for «محلل بيانات», as the job card draws it (title, company · city, the open ring). Its moment: the ring rises from 70% to 90% (the arc draws and the number counts as one value).
import { Ring } from "@/components/motion";

import { DEMO } from "../demo";
import { PieceCard, usePlayed, type PieceProps } from "../piece-frame";

export function MatchCard({ state, delay, compact = false }: PieceProps) {
  const played = usePlayed(state);
  return (
    <PieceCard compact={compact}>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-h3">{DEMO.job.title}</p>
          <p className="mt-0.5 truncate text-small text-fg-2">
            {DEMO.job.company} · {DEMO.job.city}
          </p>
        </div>
        <Ring value={played ? DEMO.match.after : DEMO.match.before} delay={played ? delay : 0} size={compact ? 76 : 84} />
      </div>
    </PieceCard>
  );
}
