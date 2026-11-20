// Splitting text into units that are safe to reveal one at a time. Arabic letters join, so the smallest unit is a
// grapheme (for typing into a real field, one text node) or a word (for WordsIn). Never per-letter spans.

const graphemeSegmenter = new Intl.Segmenter("ar", { granularity: "grapheme" });
const wordSegmenter = new Intl.Segmenter("ar", { granularity: "word" });

/** «سارة» -> ["س", "ا", "ر", "ة"]; keeps combining marks with their letter. For useTypeOn inside a field. */
export const graphemes = (text: string): string[] => Array.from(graphemeSegmenter.segment(text), (s) => s.segment);

/** Words and the spaces between them, in order (joining them gives the text back). For useTypeOn by words. */
export const words = (text: string): string[] => Array.from(wordSegmenter.segment(text), (s) => s.segment);

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * Headline chunks for WordsIn: whitespace-separated words, with consecutive non-Arabic words merged into one chunk
 * ("Power BI", "+200 XP", "70%"), because each chunk becomes an inline-block and a row of Latin inline-blocks would be
 * laid out right to left in an RTL line.
 */
export function headlineChunks(text: string): { text: string; space: string }[] {
  const parts = text.split(/(\s+)/);
  const out: { text: string; space: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const word = parts[i] ?? "";
    const space = parts[i + 1] ?? "";
    if (word === "") {
      const last = out[out.length - 1];
      if (last) last.space += space;
      continue;
    }
    const last = out[out.length - 1];
    if (last && !ARABIC.test(last.text) && !ARABIC.test(word) && last.space !== "") {
      last.text = `${last.text}${last.space}${word}`;
      last.space = space;
    } else out.push({ text: word, space });
  }
  return out;
}
