// Owner: signin. The six showcase pieces, in the spec's order (3.1 table): piece 1 to piece 6.
import type { ComponentType } from "react";

import type { PieceProps } from "../piece-frame";

import { AdvisorCard } from "./advisor-card";
import { LeaderboardCard } from "./leaderboard-card";
import { MatchCard } from "./match-card";
import { RoadmapStrip } from "./roadmap-strip";
import { SkillsCard } from "./skills-card";
import { XpCard } from "./xp-card";

export const PIECES: readonly ComponentType<PieceProps>[] = [RoadmapStrip, MatchCard, SkillsCard, AdvisorCard, XpCard, LeaderboardCard];
