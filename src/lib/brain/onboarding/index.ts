// Owner: brain-advisor. The onboarding conversation of spec 4 as a PURE script that runs in the browser (4.1: instant,
// offline, identical on every run). The welcome screen calls it; the store applies its turns.
// Internal files: tables.ts (keywords, acknowledgement bank, special replies), read.ts (the 4.3 order of reading).
// `pendingQuestion` and `onboardingContext` are written in full by the architect (they ARE the "pending" contract).
import { NEUTRAL_PRINT } from "@/lib/copy";
import { JOB_CITIES, getQuestion, optionLabel } from "@/lib/data";
import { QUESTION_IDS, isOptionOf } from "@/lib/ids";
import type { CityValue, InterestOption, OnboardingAnswers, QuestionId, UserState } from "@/lib/types";
import type { OnboardingChipSet, OnboardingContext, OnboardingInput, OnboardingTurn } from "@/lib/brain/protocol";
import { LIMITS } from "@/lib/brain/protocol";
import { normalizeText } from "@/lib/text/normalize";

import { Reading, readGreeting, readNeutral, readOthers, readPending, readQuestion, type Found, type Special } from "./read";
import { ACK, FILLER_WORDS, LEAD_OTHER, LEAD_SALAM, QUESTION_NUMBER, REPLY } from "./tables";

// ── Small helpers ──────────────────────────────────────────────────────────────────────────────────────────────────

/** «خالد» from «خالد العتيبي»: how «دليل» addresses the user. */
function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

/** The question as «دليل» asks it (q3 after `secondary` has its own wording, 4.2). */
function questionText(question: QuestionId, answers: OnboardingAnswers): string {
  const q = getQuestion(question);
  if (question === "major" && answers.education === "secondary" && q.textAfterSecondary) return q.textAfterSecondary;
  return q.text;
}

function chipLabel(question: QuestionId, option: string): string {
  return optionLabel(question, option) ?? option;
}

/**
 * The acknowledgement variant (4.4): (characters in the name, spaces not counted + question number) mod 3 → variant
 * 1, 2, 3. «خالد» gets city variant 3, education variant 1, major variant 2.
 */
function variant(name: string, question: QuestionId): 0 | 1 | 2 {
  const letters = [...name.replace(/\s+/g, "")].length;
  return ((letters + QUESTION_NUMBER[question]) % 3) as 0 | 1 | 2;
}

/** Cities with jobs in the data (riyadh, jeddah, dammam); the others get the «الفرص القريبة منك قليلة…» line. */
function cityHasJobs(value: CityValue): boolean {
  return JOB_CITIES.some((c) => c.id !== "remote" && c.id === value);
}

/** The neutral value of each question (4.3) and how it prints in «تمام، سأعتبرها «…» ونكمل.». */
function neutralAnswer(question: QuestionId): { readonly answers: OnboardingAnswers; readonly label: string } {
  switch (question) {
    case "city":
      return { answers: { city: { value: "none", label: "" } }, label: NEUTRAL_PRINT.city };
    case "education":
      return { answers: { education: "unknown" }, label: NEUTRAL_PRINT.education };
    case "major": {
      const label = optionLabel("major", "other") ?? NEUTRAL_PRINT.major;
      return { answers: { major: { value: "other", label } }, label: NEUTRAL_PRINT.major || label };
    }
    case "experience":
      return { answers: { experience: "none" }, label: chipLabel("experience", "none") };
    case "interest":
      return { answers: { interest: ["unsure"] }, label: chipLabel("interest", "unsure") };
    case "priority":
      return { answers: { priority: "explore" }, label: chipLabel("priority", "explore") };
  }
}

/** The typed words kept for an answer accepted as typed (4.5 second miss), filler words left out. */
function typedLabel(text: string): string | null {
  const fillers = new Set(FILLER_WORDS.map((w) => normalizeText(w)));
  const words = text
    .replace(/[؟?.,،!؛:«»"()]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w !== "" && !fillers.has(normalizeText(w)));
  const label = words.join(" ");
  const letters = [...label].filter((ch) => /\p{L}/u.test(ch)).length;
  return letters >= 2 && letters <= 30 ? label : null;
}

// ── Recording answers ──────────────────────────────────────────────────────────────────────────────────────────────

/** One answer as recorded this turn, and the words that acknowledge it. */
interface Recorded {
  readonly question: QuestionId;
  readonly answers: OnboardingAnswers;
  /** The acknowledgement of 4.4 (or the neutral line of 4.5). */
  readonly ack: string;
  /** How it is confirmed when it came along with another answer: «تخصصك تسويق», «بدون خبرة بعد». */
  readonly extra: string;
}

function ackCity(name: string, value: CityValue, label: string): string {
  if (!cityHasJobs(value)) return ACK.cityNoJobs(label);
  return ACK.city[variant(name, "city")](label);
}

function recordFound(name: string, found: Found, typed: string | null = null): Recorded {
  switch (found.question) {
    case "city": {
      const label = found.label ?? (found.value === "other" && typed ? typed : chipLabel("city", found.value));
      return {
        question: "city",
        answers: { city: { value: found.value, label } },
        ack: ackCity(name, found.value, label),
        extra: `مدينتك ${label}`,
      };
    }
    case "education": {
      const label = chipLabel("education", found.value);
      return {
        question: "education",
        answers: { education: found.value },
        ack: found.value === "student" ? ACK.educationStudent : ACK.education[variant(name, "education")](label),
        extra: `مؤهلك ${label}`,
      };
    }
    case "major": {
      const label = found.value === "other" ? (typed ?? chipLabel("major", "other")) : chipLabel("major", found.value);
      return {
        question: "major",
        answers: { major: { value: found.value, label } },
        ack: found.value === "other" ? ACK.majorOther : ACK.major[variant(name, "major")](label),
        extra: `تخصصك ${label}`,
      };
    }
    case "experience": {
      const label = chipLabel("experience", found.value);
      return {
        question: "experience",
        answers: { experience: found.value },
        ack: ACK.experience[found.value],
        extra: found.value === "none" ? label : `خبرتك ${label}`,
      };
    }
    case "interest": {
      const [first, second] = found.values;
      const labels = found.values.map((v) => chipLabel("interest", v));
      return {
        question: "interest",
        answers: { interest: second ? [first, second] : [first] },
        ack: ACK.interest[first],
        extra: `اهتمامك ${labels.join(" و")}`,
      };
    }
    case "priority": {
      const label = chipLabel("priority", found.value);
      return { question: "priority", answers: { priority: found.value }, ack: ACK.priority[found.value], extra: `أولويتك ${label}` };
    }
  }
}

function recordNeutral(question: QuestionId): Recorded {
  const neutral = neutralAnswer(question);
  return { question, answers: neutral.answers, ack: ACK.neutral(neutral.label), extra: neutral.label };
}

/** A chip's option id as an answer (4.2: recorded directly, never parsed). Null for an id that is not an option. */
function chipFound(question: QuestionId, option: string): Found | null {
  switch (question) {
    case "city":
      return isOptionOf("city", option) ? { question, value: option, label: null } : null;
    case "education":
      return isOptionOf("education", option) ? { question, value: option } : null;
    case "major":
      return isOptionOf("major", option) ? { question, value: option } : null;
    case "experience":
      return isOptionOf("experience", option) ? { question, value: option } : null;
    case "interest":
      return isOptionOf("interest", option) ? { question, values: [option] } : null;
    case "priority":
      return isOptionOf("priority", option) ? { question, value: option } : null;
  }
}

/** Model-classified option ids as an answer (interest: up to two; others: the first valid id). */
function classifiedFound(question: QuestionId, options: readonly string[]): Found | null {
  if (question === "interest") {
    const valid = options.filter((o): o is InterestOption => isOptionOf("interest", o));
    const [a, b] = [...new Set(valid)];
    if (!a) return null;
    return { question, values: b ? [a, b] : [a] };
  }
  for (const option of options) {
    const found = chipFound(question, option);
    if (found) return found;
  }
  return null;
}

// ── The turn ───────────────────────────────────────────────────────────────────────────────────────────────────────

function merge(answers: OnboardingAnswers, recorded: readonly Recorded[]): OnboardingAnswers {
  let out: OnboardingAnswers = answers;
  for (const r of recorded) out = { ...out, ...r.answers };
  return out;
}

function unansweredIn(answers: OnboardingAnswers): QuestionId[] {
  return QUESTION_IDS.filter((q) => answers[q] === undefined);
}

/** The turn after answers were recorded: acknowledgement (+ extras), then the next question or the closing line. */
function answeredTurn(
  context: OnboardingContext,
  userText: string,
  recorded: readonly Recorded[],
  misses: OnboardingContext["misses"],
  unmapped: OnboardingTurn["unmapped"] = null,
): OnboardingTurn {
  const answers = merge(context.answers, recorded);
  const [primary, ...extras] = recorded;
  const ack = primary
    ? extras.length > 0
      ? `${primary.ack} ${REPLY.alsoRecorded(joinCommaAnd(extras.map((r) => r.extra)))}`
      : primary.ack
    : null;
  const pending = pendingQuestion(answers);
  const name = firstName(context.name);
  const replies = [
    ...(ack ? [ack] : []),
    ...(pending === null ? [REPLY.closing(name)] : [questionText(pending, answers)]),
  ];
  return {
    userText,
    replies,
    answers,
    misses,
    pending,
    chips: pending === null ? null : questionChips(pending, answers),
    done: pending === null,
    unmapped,
  };
}

/** A turn that answers something else and asks the pending question again (4.5: it never loops, never stalls). */
function sideTurn(
  context: OnboardingContext,
  pending: QuestionId,
  userText: string,
  reply: string,
  misses: OnboardingContext["misses"] = context.misses,
  unmapped: OnboardingTurn["unmapped"] = null,
): OnboardingTurn {
  return {
    userText,
    replies: [reply, questionText(pending, context.answers)],
    answers: context.answers,
    misses,
    pending,
    chips: questionChips(pending, context.answers),
    done: false,
    unmapped,
  };
}

function specialReply(special: Special, context: OnboardingContext): string {
  switch (special) {
    case "who":
      return REPLY.who;
    case "why-ask":
      return REPLY.whyAsk;
    case "count":
      return REPLY.count(unansweredIn(context.answers).length);
    case "question":
      return REPLY.otherQuestion;
    case "greeting-salam":
      return REPLY.greetingSalam;
    case "greeting":
      return REPLY.greetingOther;
    case "thanks":
      return REPLY.thanks;
  }
}

function joinCommaAnd(items: readonly string[]): string {
  return items.reduce((out, item, index) => (index === 0 ? item : `${out}، و${item}`), "");
}

/** «وعليكم السلام.» / «هلا بك.» when the message greets as well as saying something else (QA: return the salam). */
function greetingLead(text: string): string | null {
  const reading = new Reading(text);
  if (reading.mentions(LEAD_SALAM)) return REPLY.leadSalam;
  if (reading.mentions(LEAD_OTHER)) return REPLY.leadOther;
  return null;
}

/** The turn with the returned greeting in front of its first reply. */
function withLead(turn: OnboardingTurn, lead: string | null): OnboardingTurn {
  const [first, ...rest] = turn.replies;
  if (lead === null || first === undefined) return turn;
  return { ...turn, replies: [`${lead} ${first}`, ...rest] };
}

function textTurn(context: OnboardingContext, pending: QuestionId, raw: string): OnboardingTurn {
  const text = raw.slice(0, LIMITS.onboardingMessageChars);
  const userText = text.trim();
  if (userText === "") return sideTurn(context, pending, userText, REPLY.unmapped);

  const reading = new Reading(text);

  // Step 2 (below) answers a greeting on its own; one that comes with anything else is returned before the reply.
  const lead = greetingLead(text);

  // Step 1: a question (the three special rows first, by their keywords).
  const question = readQuestion(text, reading);
  if (question) return withLead(sideTurn(context, pending, userText, specialReply(question, context)), lead);

  // Step 2: greetings and thanks set aside; alone, they are answered as such.
  const greeting = readGreeting(reading);
  if (greeting) return sideTurn(context, pending, userText, specialReply(greeting, context));

  return withLead(readAnswers(context, pending, userText, reading), lead);
}

/** Steps 3-5 of 4.3 on what steps 1-2 left. */
function readAnswers(context: OnboardingContext, pending: QuestionId, userText: string, reading: Reading): OnboardingTurn {

  // Step 3: the pending question; for it, «لا أعرف» is itself an answer (its neutral value).
  const recorded: Recorded[] = [];
  const pendingFound = readPending(reading, pending);
  if (pendingFound) recorded.push(recordFound(context.name, pendingFound));
  else if (readNeutral(reading)) recorded.push(recordNeutral(pending));

  // Step 4: the other unanswered questions.
  const others = unansweredIn(context.answers).filter((q) => q !== pending);
  for (const found of readOthers(reading, others)) recorded.push(recordFound(context.name, found));

  if (recorded.length > 0) return answeredTurn(context, userText, recorded, context.misses);

  // Step 5: could not be mapped. First time: ask again. Second time: city and major are accepted as typed (2-30
  // letters), the other four take their neutral value; either way the conversation moves on.
  const missed = (context.misses[pending] ?? 0) + 1;
  const misses = { ...context.misses, [pending]: missed };
  const unmapped = { question: pending, text: userText };
  if (missed < 2) return sideTurn(context, pending, userText, REPLY.unmapped, misses, unmapped);
  if (pending === "city" || pending === "major") {
    const typed = typedLabel(userText);
    if (typed) {
      const found: Found = pending === "city" ? { question: "city", value: "other", label: typed } : { question: "major", value: "other" };
      return answeredTurn(context, userText, [recordFound(context.name, found, typed)], misses, unmapped);
    }
  }
  return answeredTurn(context, userText, [recordNeutral(pending)], misses, unmapped);
}

// ── Contract exports ───────────────────────────────────────────────────────────────────────────────────────────────

/** «دليل»'s opening (4.1): the greeting, the six-questions line, then question 1 in its own message (it stood at the end
 *  of a long second message and wrapped there; on its own it reads as the question it is). */
export function openingMessages(name: string): readonly string[] {
  return [REPLY.opening(firstName(name)), REPLY.openingLead, `${REPLY.openingAsk} ${questionText("city", {})}`];
}

/** The re-ask after a reload mid-conversation (3.2 "Resumed"): the pending question again. */
export function resumeMessages(context: OnboardingContext): readonly string[] {
  const pending = context.pending ?? pendingQuestion(context.answers);
  return pending === null ? [] : [questionText(pending, context.answers)];
}

/** The chips of a question for the current answers (question 3 after `secondary` keeps the same chips). */
export function questionChips(question: QuestionId, answers: OnboardingAnswers): OnboardingChipSet {
  void answers;
  return { question, options: getQuestion(question).options };
}

/** One turn: reads a chip (by id) or a typed message (4.3 order of reading), acknowledges (4.4), replies (4.5), moves on. */
export function onboardingTurn(context: OnboardingContext, input: OnboardingInput): OnboardingTurn {
  const pending = context.pending ?? pendingQuestion(context.answers);
  if (pending === null) {
    // Already complete: nothing to record (the screen has moved on to the reveal).
    const userText = input.kind === "chip" ? chipLabel(input.question, input.option) : input.text.trim();
    return { userText, replies: [], answers: context.answers, misses: context.misses, pending: null, chips: null, done: true, unmapped: null };
  }

  if (input.kind === "chip") {
    const userText = chipLabel(input.question, input.option);
    // «مدينة أخرى» is never sent (it focuses the composer); an unknown id is read as typed text instead.
    if (input.question === "city" && input.option === "other") {
      return { userText: "", replies: [], answers: context.answers, misses: context.misses, pending, chips: questionChips(pending, context.answers), done: false, unmapped: null };
    }
    const found = chipFound(input.question, input.option);
    if (!found) return textTurn(context, pending, userText);
    return answeredTurn(context, userText, [recordFound(context.name, found)], context.misses);
  }

  if (input.kind === "classified") {
    const found = classifiedFound(input.question, input.options);
    const typed = typedLabel(input.text);
    if (!found) return textTurn(context, pending, input.text);
    return withLead(answeredTurn(context, input.text.trim(), [recordFound(context.name, found, typed)], context.misses), greetingLead(input.text));
  }

  return textTurn(context, pending, input.text);
}

/**
 * The question «دليل» is waiting on: the first of the six, in their fixed order (4.1), that has no answer yet (a
 * question already answered in an earlier free-text message is skipped, 4.3). Null when all six are answered.
 */
export function pendingQuestion(answers: OnboardingAnswers): QuestionId | null {
  for (const question of QUESTION_IDS) {
    if (answers[question] === undefined) return question;
  }
  return null;
}

/**
 * The interpreter's context from a saved user. `pending` is derived, never stored: null before the greeting (empty
 * thread), else pendingQuestion(answers). So after the greeting it is "city", which gives welcome question 1's chips,
 * lets a typed first answer be read against it (4.3 step 3), and lets resumeMessages re-ask after a reload.
 */
export function onboardingContext(user: UserState): OnboardingContext {
  return {
    name: user.name,
    answers: user.answers,
    misses: user.onboarding.misses,
    pending: user.onboarding.thread.length === 0 ? null : pendingQuestion(user.answers),
  };
}
