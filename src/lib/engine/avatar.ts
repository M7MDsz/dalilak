// Owner: engine. The default avatar of a new account (spec 9.6).
import { cleanName } from "@/lib/text/normalize";
import type { AvatarId } from "@/lib/types";

const NEUTRAL: readonly [AvatarId, AvatarId, AvatarId, AvatarId] = ["av-01", "av-02", "av-03", "av-04"];

/** Sum of the code points of the cleaned name, mod 4, plus 1 → av-01..av-04. «خالد» → av-01; «محمد» → av-03. */
export function defaultAvatar(name: string): AvatarId {
  let sum = 0;
  for (const ch of cleanName(name)) sum += ch.codePointAt(0) ?? 0;
  return NEUTRAL[sum % 4] ?? "av-01";
}
