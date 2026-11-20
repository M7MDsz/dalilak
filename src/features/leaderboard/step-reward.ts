// Owner: leaderboard. The XP the user's next step (spec 2.8) really pays, for the reward chip beside «أسرع طريق للصعود»
// (docs/GAME-LAYER.md 5.9). Only what spec 8.1 pays, never an estimate:
//   rule 1 «ارفع سيرتك الذاتية» → +100 for the first CV analysis (none if one was ever paid)
//   rule 2 «أكمل تعلّم …» / rule 3 «تعلّم …» → that course's XP (20 × its hours), paid when «خلّصتها» is pressed
//   rule 4 «قدّم على …» → +40 (the target is at 100%, so the 60% line is met; once per job)
//   rule 5 «استعرض الوظائف» → nothing to show
// Pure: reads the step and the user's facts.
import { courseXp, jobMatch } from "@/lib/engine";
import { getCourse, MATCH_LINE, XP } from "@/lib/data";
import type { NextStep, UserFacts } from "@/lib/types";

export function stepReward(step: NextStep, facts: UserFacts): number | null {
  switch (step.rule) {
    case 1:
      return facts.xpEvents.some((e) => e.type === "cv_analysed") ? null : XP.cv_analysed;
    case 2:
      return courseXp(getCourse(step.courseId));
    case 3:
      return step.xp;
    case 4: {
      const paid = facts.applications.some((a) => a.jobId === step.jobId);
      return !paid && jobMatch(step.jobId, facts) >= MATCH_LINE ? XP.job_applied : null;
    }
    case 5:
      return null;
  }
}
