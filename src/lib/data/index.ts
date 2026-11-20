// Owner: data. The static catalogue of spec 9 and the game constants. Import from "@/lib/data".
export * from "./badges";
export * from "./cities";
export * from "./companies";
export * from "./courses";
export * from "./fields";
export * from "./game";
export * from "./guides";
// every guide, the expansion's 16 included (an explicit export wins over the star export above)
export { GUIDES, getGuide } from "./all-guides";
export * from "./jobs";
export * from "./leaderboard";
export * from "./levels";
export * from "./onboarding";
export * from "./sa-places";
export * from "./sample-cv";
export * from "./skills";
