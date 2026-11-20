// One place for number formatting. Masari shows Latin digits everywhere (never Arabic-Indic), and the server and the
// browser must agree, so the locale is fixed.
const number = new Intl.NumberFormat("en-US");

/** 1240 -> "1,240" */
export function formatNumber(value: number): string {
  return number.format(Math.round(value));
}

/** 70 -> "70%" */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** 200 -> "+200" (for XP gains) */
export function formatGain(value: number): string {
  return `+${number.format(Math.round(value))}`;
}

/**
 * Makes "90%" display correctly inside Arabic running text. After an Arabic letter, the bidi algorithm turns the digits
 * into Arabic numbers and the "%" then falls to their left («%90»). A left-to-right mark before each number fixes the
 * display without changing the words. Use it when rendering a sentence that mixes Arabic with a number and "%".
 */
export function bidiNumbers(text: string): string {
  return text.replace(/(\d[\d,.]*\s?%)/g, "‎$1");
}
