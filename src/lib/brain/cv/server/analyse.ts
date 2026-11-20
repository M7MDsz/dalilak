// Owner: brain-cv. SERVER-ONLY. Text → skills (spec 6.5, 6.6):
// 1. analyseCvLocal(text) always first. 2. The sample CV (isSampleCv) or no online provider: return the local result.
// 3. Otherwise ask the model (modelCvSkills, 12 s) for skills the aliases missed; keep only known skill ids whose evidence
//    sentence really occurs in the text; the model NEVER sets stars (zone rule: 2 in an applied zone, else 1, capped);
//    local skills keep their stars and evidence. engine "model" only when the model call succeeded with a list.
// Any failure on the model side (timeout, error, refusal, empty list, a provider module that throws) is silent: the
// local result stands alone.
import type { CvAnalyseRequest, CvAnalyseResponse } from "@/lib/brain/protocol";
import { providerCoolingDown, resolveProvider } from "@/lib/brain/server/provider";

import { cleanCvLines } from "../clean";
import { analyseCvLocal } from "../local-analyser";
import { mergeModelSkills } from "../merge";

import { modelCvSkills } from "./model";

function providerOnline(): boolean {
  try {
    return resolveProvider() !== null && !providerCoolingDown();
  } catch {
    return false;
  }
}

/** What analyseCv needs from the outside (a seam so the 6.6 flow is tested without a key or a network). */
export interface AnalyseDeps {
  /** A provider resolves and is not cooling down. */
  readonly online: () => boolean;
  readonly model: typeof modelCvSkills;
}

const PROVIDER_DEPS: AnalyseDeps = { online: providerOnline, model: modelCvSkills };

/** analyseCv with its outside world passed in (tests); product code calls analyseCv. */
export async function analyseCvWith(request: CvAnalyseRequest, signal: AbortSignal, deps: AnalyseDeps): Promise<CvAnalyseResponse> {
  const local = analyseCvLocal(request.text);
  let online = false;
  try {
    online = !local.isSample && deps.online();
  } catch {
    online = false;
  }
  if (!online) return { ok: true, analysis: local };
  let candidates: Awaited<ReturnType<typeof modelCvSkills>> = null;
  try {
    candidates = await deps.model(request.text, signal);
  } catch {
    candidates = null;
  }
  if (candidates === null || candidates.length === 0) return { ok: true, analysis: local };
  const merged = mergeModelSkills(local.skills, cleanCvLines(request.text), candidates);
  return { ok: true, analysis: { ...local, skills: merged.skills, engine: "model" } };
}

export async function analyseCv(request: CvAnalyseRequest, signal: AbortSignal): Promise<CvAnalyseResponse> {
  return analyseCvWith(request, signal, PROVIDER_DEPS);
}
