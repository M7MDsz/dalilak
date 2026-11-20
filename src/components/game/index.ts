// Dalilak's game layer: the shared game pieces every screen builder drops in (docs/GAME-LAYER.md). Data-agnostic: props in,
// no store reads. Built from the design system (@/components/ui), the motion blocks, the icons, avatars and emblems.
export { dailyRewardFor, GAME_STATES, hoursLabel, isRaised, lessonsLabel, matchOf, requirementFill, STATE_LABEL, starLabel, type GameState } from "./state";
export { Tile, TILE_DEPTH, type TileDepth, type TileProps, type TileRadius } from "./tile";
export { StateRibbon, type RibbonTone, type StateRibbonProps } from "./ribbon";
export { RewardChip, RewardRow, XpCoin, type RewardChipProps, type RewardKind, type RewardStatus } from "./reward";
export { gemStateOf, LockedGem, SkillGem, type GemState, type SkillGemProps } from "./gem";
export { CollectionMeter, LessonMeter, requirementsCaption, Segments, UnlockMeter, type Requirement, type SegmentsProps, type UnlockMeterProps } from "./meter";
export { QuestCard, QuestNumber, type QuestCardProps } from "./quest";
export { DestinationCard, type ApplyReward, type DestinationCardProps } from "./destination";
export { LevelToken, PlayerCard, PlayerChip, StatTile, StreakCount, useShownLevel, XpTrack, type PlayerCardProps, type PlayerChipProps, type StatTileProps, type XpTrackProps } from "./hud";
export { DailyTrack, dailyDays, type DailyDay, type DailyState, type DailyTrackProps } from "./daily";
export { LootCard, LootReveal, type LootCardProps, type LootRevealProps } from "./loot";
export { AnswerTile, StepTrail, type AnswerTileProps, type StepTrailProps } from "./answer";
