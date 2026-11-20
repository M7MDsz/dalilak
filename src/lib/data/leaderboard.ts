// Owner: data. The 24 fictional leaderboard users of spec 9.5, with their fixed values (they never move).
// The board ranks by weeklyXp; totalXp only derives the level shown in a row (engine `levelFor`). Pure module.
import type { LeaderboardUser, LeaderboardUserId } from "@/lib/types";

export const LEADERBOARD_USERS: readonly LeaderboardUser[] = [
  { id: "u01", name: "نورة ع.", city: "الرياض", avatar: "av-05", totalXp: 3120, weeklyXp: 560 },
  { id: "u02", name: "فيصل ق.", city: "جدة", avatar: "av-09", totalXp: 2740, weeklyXp: 980 },
  { id: "u03", name: "ريم ح.", city: "الدمام", avatar: "av-06", totalXp: 2380, weeklyXp: 440 },
  { id: "u04", name: "عبدالله ش.", city: "الرياض", avatar: "av-12", totalXp: 2150, weeklyXp: 790 },
  { id: "u05", name: "لمى د.", city: "المدينة المنورة", avatar: "av-05", totalXp: 1890, weeklyXp: 250 },
  { id: "u06", name: "سلطان م.", city: "الرياض", avatar: "av-10", totalXp: 1720, weeklyXp: 910 },
  { id: "u07", name: "جود ز.", city: "جدة", avatar: "av-07", totalXp: 1540, weeklyXp: 340 },
  { id: "u08", name: "تركي غ.", city: "أبها", avatar: "av-10", totalXp: 1410, weeklyXp: 640 },
  { id: "u09", name: "هيفاء ب.", city: "الخبر", avatar: "av-07", totalXp: 1280, weeklyXp: 190 },
  { id: "u10", name: "مشعل ر.", city: "الرياض", avatar: "av-11", totalXp: 1150, weeklyXp: 860 },
  { id: "u11", name: "دانة ف.", city: "مكة المكرمة", avatar: "av-06", totalXp: 1040, weeklyXp: 120 },
  { id: "u12", name: "راكان س.", city: "الدمام", avatar: "av-09", totalXp: 960, weeklyXp: 720 },
  { id: "u13", name: "شهد ن.", city: "الرياض", avatar: "av-08", totalXp: 880, weeklyXp: 310 },
  { id: "u14", name: "بندر ط.", city: "تبوك", avatar: "av-11", totalXp: 810, weeklyXp: 480 },
  { id: "u15", name: "غادة ي.", city: "جدة", avatar: "av-07", totalXp: 740, weeklyXp: 70 },
  { id: "u16", name: "ماجد ك.", city: "بريدة", avatar: "av-12", totalXp: 670, weeklyXp: 370 },
  { id: "u17", name: "أسيل ج.", city: "الرياض", avatar: "av-06", totalXp: 590, weeklyXp: 230 },
  { id: "u18", name: "نواف ه.", city: "الطائف", avatar: "av-09", totalXp: 520, weeklyXp: 280 },
  { id: "u19", name: "رغد ص.", city: "الدمام", avatar: "av-08", totalXp: 460, weeklyXp: 160 },
  { id: "u20", name: "يزيد ل.", city: "الرياض", avatar: "av-10", totalXp: 390, weeklyXp: 210 },
  { id: "u21", name: "ملاك و.", city: "جدة", avatar: "av-05", totalXp: 330, weeklyXp: 140 },
  { id: "u22", name: "سعود ت.", city: "حائل", avatar: "av-11", totalXp: 260, weeklyXp: 90 },
  { id: "u23", name: "لين أ.", city: "الرياض", avatar: "av-08", totalXp: 190, weeklyXp: 40 },
  { id: "u24", name: "عمر خ.", city: "جازان", avatar: "av-12", totalXp: 120, weeklyXp: 20 },
];

export function getLeaderboardUser(id: LeaderboardUserId): LeaderboardUser {
  const user = LEADERBOARD_USERS.find((u) => u.id === id);
  if (!user) throw new Error(`data: unknown leaderboard user ${id}`);
  return user;
}
