// Owner: brain-cv. The rules of spec 6.6 that a model's answer must pass, in code (pure, so they are unit-tested without
// a key). The server's analyse step calls this with the model's raw candidates.
import { SKILLS } from "@/lib/data";
import { isSkillId } from "@/lib/ids";
import type { CvSkill, SkillId, StarSlot } from "@/lib/types";

import type { CvLine } from "./clean";
import { cvWords, evidenceText } from "./local-analyser";

/** A quoted evidence sentence must have at least this many words (a sentence, not a bare skill name). */
export const MODEL_EVIDENCE_MIN_WORDS = 3;

/** The first cleaned line whose words contain the evidence's words, in order and side by side (4.3 normalisation). */
export function evidenceLineIndex(lines: readonly CvLine[], evidence: string): number {
  const needle = cvWords(evidence);
  if (needle.length < MODEL_EVIDENCE_MIN_WORDS) return -1;
  return lines.findIndex((line) => {
    const hay = cvWords(line.text);
    for (let i = 0; i + needle.length <= hay.length; i += 1) {
      if (needle.every((word, j) => hay[i + j] === word)) return true;
    }
    return false;
  });
}

/**
 * Spec 6.6. `candidates` is whatever the model sent (unknown shape). Kept: a known skill id (one of the 38) that the
 * local analyser did not find, whose evidence sentence really occurs in one cleaned line of the CV. The model never sets
 * stars: a model-only skill gets 2 when its evidence line is in an applied zone, else 1, lowered to the skill's maximum;
 * its evidence is that cleaned line (cut like every evidence line). Local skills keep their stars and evidence.
 * Returns the merged list in document order of the evidence line, then catalogue order, and how many skills the model
 * added.
 */
export function mergeModelSkills(
  local: readonly CvSkill[],
  lines: readonly CvLine[],
  candidates: readonly { readonly skill: string; readonly evidence: string }[],
): { readonly skills: readonly CvSkill[]; readonly added: number } {
  const have = new Set<SkillId>(local.map((s) => s.skill));
  const added: CvSkill[] = [];
  for (const candidate of candidates) {
    if (!isSkillId(candidate.skill) || have.has(candidate.skill)) continue;
    const skill = SKILLS.find((s) => s.id === candidate.skill);
    if (skill === undefined) continue;
    const index = evidenceLineIndex(lines, candidate.evidence);
    const line = lines[index];
    if (line === undefined) continue;
    const raw: StarSlot = line.zone === "applied" ? 2 : 1;
    const stars: StarSlot = raw <= skill.maxStars ? raw : skill.maxStars;
    added.push({ skill: skill.id, stars, evidence: evidenceText(line.text), line: index });
    have.add(skill.id);
  }
  const order = new Map<SkillId, number>(SKILLS.map((s, i) => [s.id, i]));
  const skills = [...local, ...added].sort(
    (a, b) => a.line - b.line || (order.get(a.skill) ?? 0) - (order.get(b.skill) ?? 0),
  );
  return { skills, added: added.length };
}
