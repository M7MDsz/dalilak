// Owner: brain-cv. The sample-CV test of spec 6.1: with whitespace collapsed and its first line ignored, the text equals
// the sample of 6.2 (data `SAMPLE_CV_BODY`). Then no provider call is ever made.
import { SAMPLE_CV_BODY } from "@/lib/data";

import { cleanCvText } from "./clean";

const collapse = (text: string): string => text.replace(/\s+/gu, " ").trim();

/**
 * Spec 6.1. Both sides go through the step-1 clean-up of 6.5 first (NFKC, direction marks, tatweel, digits), so the
 * sample printed to a PDF (presentation-form letters) is still the sample; then whitespace is collapsed and the first
 * non-empty line (the user's name) is ignored. An edited sample is an ordinary CV.
 */
export function isSampleCv(raw: string): boolean {
  const body = collapse(cleanCvText(SAMPLE_CV_BODY));
  if (body === "") return false;
  const lines = cleanCvText(raw).split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first < 0) return false;
  return collapse(lines.slice(first + 1).join("\n")) === body;
}
