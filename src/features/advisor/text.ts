// Owner: advisor. Display-only typography for «دليلك»'s words in the panel (the saved text is never changed):
// - tidyReply: a number stays on the same line as the word after it («12 ساعة», «40 XP», «DL-2026-0001 وأنت»). The
//   no-break space is invisible. (A Latin run itself, such as DL-2026-0001, is kept whole by the thread's CSS: the chat
//   kit isolates each run in a <bdi>, and the panel gives those `white-space: nowrap`.)
// - isolateRuns: a chip's label is a plain string (the chat kit draws it as text), so a Latin run inside Arabic needs
//   Unicode isolates, or the percent jumps to the wrong side («لماذا مطابقتي 90%؟» drawn as «%90؟»: after an Arabic
//   letter the digits become Arabic numbers and the % no longer belongs to them).
const NBSP = String.fromCharCode(0x00a0);
const LRI = String.fromCharCode(0x2066);
const PDI = String.fromCharCode(0x2069);

/** A number (with its % or a code such as DL-2026-0001) glued to the next word. */
export function tidyReply(text: string): string {
  return text.replace(/(\d%?) (?=\S)/g, `$1${NBSP}`);
}

// a Latin run: letters, digits and the signs that belong to them; inner spaces only between Latin words
const LATIN_RUN = /\+?[A-Za-z0-9](?:[A-Za-z0-9.,%+#_-]*[A-Za-z0-9%+#])?(?:\s+[A-Za-z0-9](?:[A-Za-z0-9.,%+#_-]*[A-Za-z0-9%+#])?)*/g;

/** Wraps every Latin run in a left-to-right isolate, for labels drawn as plain text. */
export function isolateRuns(text: string): string {
  return text.replace(LATIN_RUN, (run) => `${LRI}${run}${PDI}`);
}
