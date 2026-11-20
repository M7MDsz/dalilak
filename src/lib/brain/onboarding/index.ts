// Owner: brain-advisor. The onboarding conversation of spec 4 as a PURE script that runs in the browser (4.1: instant,
// offline, identical on every run). The welcome screen calls it; the store applies its turns.
// Internal files: tables.ts (keywords, acknowledgement bank, special replies), read.ts (the 4.3 order of reading).
// `pendingQuestion` and `onboardingContext` are written in full by the architect (they ARE the "pending" contract).
import { NEUTRAL_PRINT } from "@/lib/copy";
import { JOB_CITIES, getCompany, getField, getJob, getJobCity, getQuestion, optionLabel } from "@/lib/data";
import { companyChoices, companyField, companyJob, companyJobsOutOfReach, companyOtherFieldJob, jobsAtCompany, userBandOf } from "@/lib/engine";
import { ONBOARDING_STEP_IDS, isOptionOf } from "@/lib/ids";
import type { CityValue, CompanyId, InterestOption, JobId, OnboardingAnswers, OnboardingStepId, UserState } from "@/lib/types";
import type { OnboardingChipSet, OnboardingContext, OnboardingInput, OnboardingTurn } from "@/lib/brain/protocol";
import { LIMITS } from "@/lib/brain/protocol";
import { normalizeText } from "@/lib/text/normalize";

import { Reading, readGreeting, readNeutral, readOthers, readPending, readQuestion, type Found, type Special } from "./read";
import { ACK, FILLER_WORDS, LEAD_OTHER, LEAD_SALAM, QUESTION_NUMBER, REPLY } from "./tables";

// ── Small helpers ──────────────────────────────────────────────────────────────────────────────────────────────────

/** «خالد» from «خالد العتيبي»: how «دليلك» addresses the user. */
function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

/** The question as «دليلك» asks it (q3 after `secondary` has its own wording, 4.2). */
function questionText(question: OnboardingStepId, answers: OnboardingAnswers): string {
  const q = getQuestion(question);
  if (question === "major" && answers.education === "secondary" && q.textAfterSecondary) return q.textAfterSecondary;
  return q.text;
}

function chipLabel(question: OnboardingStepId, option: string): string {
  return optionLabel(question, option) ?? option;
}

/**
 * The acknowledgement variant (4.4): (characters in the name, spaces not counted + question number) mod 3 → variant
 * 1, 2, 3. «خالد» gets city variant 3, education variant 1, major variant 2.
 */
function variant(name: string, question: OnboardingStepId): 0 | 1 | 2 {
  const letters = [...name.replace(/\s+/g, "")].length;
  return ((letters + QUESTION_NUMBER[question]) % 3) as 0 | 1 | 2;
}

/** Cities with jobs in the data (riyadh, jeddah, dammam); the others get the «الفرص القريبة منك قليلة…» line. */
function cityHasJobs(value: CityValue): boolean {
  return JOB_CITIES.some((c) => c.id !== "remote" && c.id === value);
}

/** The neutral value of each question (4.3) and how it prints in «تمام، سأعتبرها «…» ونكمل.». */
function neutralAnswer(question: OnboardingStepId): { readonly answers: OnboardingAnswers; readonly label: string } {
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
    case "company":
      return { answers: { company: "none" }, label: chipLabel("company", "none") };
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
  readonly question: OnboardingStepId;
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

/** The five steps before the company: once they are answered, «دليلك» can name the company's job the path will aim at. */
const BEFORE_COMPANY = ["city", "education", "major", "experience", "interest"] as const;

/** «في الرياض» / «عن بُعد». */
function whereOf(jobId: JobId): string {
  const job = getJob(jobId);
  return job.city === "remote" ? getJobCity("remote").name : `في ${getJobCity(job.city).name}`;
}

/**
 * Step 7's acknowledgement (20 Nov 2026): «لا، مو الحين»; a company with a job in the data (named, with its city, once the
 * five answers before it are in; before that, only that it has jobs); a company the data has no job of (the path goes to
 * the closest job, and the reveal says so too).
 */
function ackCompany(value: CompanyId | "none", answers: OnboardingAnswers): string {
  if (value === "none") return ACK.company.none;
  const company = getCompany(value).short;
  if (jobsAtCompany(value).length === 0) return ACK.company.noJob(company);
  if (BEFORE_COMPANY.some((q) => answers[q] === undefined)) return ACK.company.early(company);
  const job = companyJob({ ...answers, company: value });
  if (job !== null) return ACK.company.job(company, getJob(job).title, whereOf(job));
  const withCompany = { ...answers, company: value };
  if (companyJobsOutOfReach(withCompany)) return ACK.company.aboveBand(company);
  // its jobs are in another field (21 Nov 2026): said positively; the path stays in the user's field
  const other = companyOtherFieldJob(withCompany);
  if (other !== null) {
    const field = companyField(answers);
    return ACK.company.otherField(company, getJob(other).title, getField(getJob(other).field).name, field === null ? "مجالك" : getField(field).name);
  }
  return ACK.company.noJobInField(company);
}

function recordFound(name: string, found: Found, typed: string | null = null, before: OnboardingAnswers = {}): Recorded {
  switch (found.question) {
    case "city": {
      const label = found.label ?? (found.value === "other" && typed ? typed : chipLabel("city", found.value));
      return {
        question: "city",
        answers: { city: { value: found.value, label } },
        // a Saudi place outside the chips: where it is, its nearest big job market and how far (20 Nov 2026)
        ack: found.place ? ACK.cityPlace(found.place) : ackCity(name, found.value, label),
        extra: found.place?.kind === "region" ? `منطقتك ${label}` : `مدينتك ${label}`,
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
        ack: ACK.experience[found.value][variant(name, "experience")],
        extra: found.value === "none" ? label : `خبرتك ${label}`,
      };
    }
    case "interest": {
      const [first, second] = found.values;
      const labels = found.values.map((v) => chipLabel("interest", v));
      return {
        question: "interest",
        answers: { interest: second ? [first, second] : [first] },
        ack: ACK.interest[first][variant(name, "interest")],
        extra: `اهتمامك ${labels.join(" و")}`,
      };
    }
    case "priority": {
      const label = chipLabel("priority", found.value);
      return { question: "priority", answers: { priority: found.value }, ack: ACK.priority[found.value][variant(name, "priority")], extra: `أولويتك ${label}` };
    }
    case "company": {
      const label = found.value === "none" ? chipLabel("company", "none") : `الشركة اللي في بالك ${getCompany(found.value).short}`;
      return { question: "company", answers: { company: found.value }, ack: ackCompany(found.value, before), extra: label };
    }
  }
}

function recordNeutral(question: OnboardingStepId): Recorded {
  const neutral = neutralAnswer(question);
  const ack = question === "company" ? ACK.company.none : ACK.neutral(neutral.label);
  return { question, answers: neutral.answers, ack, extra: neutral.label };
}

/** A chip's option id as an answer (4.2: recorded directly, never parsed). Null for an id that is not an option. */
function chipFound(question: OnboardingStepId, option: string): Found | null {
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
    case "company":
      return isOptionOf("company", option) ? { question, value: option } : null;
  }
}

/** Model-classified option ids as an answer (interest: up to two; others: the first valid id). */
function classifiedFound(question: OnboardingStepId, options: readonly string[]): Found | null {
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

function unansweredIn(answers: OnboardingAnswers): OnboardingStepId[] {
  return ONBOARDING_STEP_IDS.filter((q) => answers[q] === undefined);
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
  const pending = pendingQuestion(answers, false, context.order);
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
  pending: OnboardingStepId,
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

function textTurn(context: OnboardingContext, pending: OnboardingStepId, raw: string): OnboardingTurn {
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
function readAnswers(context: OnboardingContext, pending: OnboardingStepId, userText: string, reading: Reading): OnboardingTurn {

  // Step 3: the pending question; for it, «لا أعرف» is itself an answer (its neutral value).
  const recorded: Recorded[] = [];
  const pendingFound = readPending(reading, pending);
  if (pendingFound) recorded.push(recordFound(context.name, pendingFound, null, context.answers));
  else if (readNeutral(reading)) recorded.push(recordNeutral(pending));

  // Step 4: the other unanswered questions.
  const others = unansweredIn(context.answers).filter((q) => q !== pending);
  for (const found of readOthers(reading, others)) recorded.push(recordFound(context.name, found, null, context.answers));

  if (recorded.length > 0) return answeredTurn(context, userText, recorded, context.misses);

  // Step 5: could not be mapped. First time: ask again. Second time: city and major are accepted as typed (2-30
  // letters), the other four take their neutral value; either way the conversation moves on. A company «دليلك» does not
  // know is never stored as typed: it stays «لا، مو الحين», and he says he did not know it.
  const missed = (context.misses[pending] ?? 0) + 1;
  const misses = { ...context.misses, [pending]: missed };
  const unmapped = { question: pending, text: userText };
  if (missed < 2) return sideTurn(context, pending, userText, pending === "company" ? REPLY.unmappedCompany : REPLY.unmapped, misses, unmapped);
  if (pending === "company") {
    return answeredTurn(context, userText, [{ ...recordNeutral("company"), ack: ACK.company.unknown }], misses, unmapped);
  }
  if (pending === "city" || pending === "major") {
    const typed = typedLabel(userText);
    if (typed) {
      const found: Found = pending === "city" ? { question: "city", value: "other", label: typed } : { question: "major", value: "other" };
      return answeredTurn(context, userText, [recordFound(context.name, found, typed, context.answers)], misses, unmapped);
    }
  }
  return answeredTurn(context, userText, [recordNeutral(pending)], misses, unmapped);
}

// ── Contract exports ───────────────────────────────────────────────────────────────────────────────────────────────

/** «دليلك»'s opening (4.1): the greeting, the seven-questions line, then question 1 in its own message (it stood at the end
 *  of a long second message and wrapped there; on its own it reads as the question it is). */
export function openingMessages(name: string): readonly string[] {
  return [REPLY.opening(firstName(name)), REPLY.openingLead, `${REPLY.openingAsk} ${questionText("city", {})}`];
}

/** The re-ask after a reload mid-conversation (3.2 "Resumed"): the pending question again. */
export function resumeMessages(context: OnboardingContext): readonly string[] {
  const pending = context.pending ?? pendingQuestion(context.answers, false, context.order);
  return pending === null ? [] : [questionText(pending, context.answers)];
}

/**
 * The chips of a question for the current answers (question 3 after `secondary` keeps the same chips). Step 7, the
 * company: the big employers of the field the user just picked (its first interest; «لم أحدّد بعد» gets the big names of
 * several fields), then «لا، مو الحين».
 */
export function questionChips(question: OnboardingStepId, answers: OnboardingAnswers): OnboardingChipSet {
  if (question === "company") {
    const tiles = companyChoices(companyField(answers), 5, answers.experience === undefined ? null : userBandOf(answers)).map((id) => ({ id, label: getCompany(id).short }));
    return { question, options: [...tiles, { id: "none", label: chipLabel("company", "none") }] };
  }
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
    return answeredTurn(context, userText, [recordFound(context.name, found, null, context.answers)], context.misses);
  }

  if (input.kind === "classified") {
    const found = classifiedFound(input.question, input.options);
    const typed = typedLabel(input.text);
    if (!found) return textTurn(context, pending, input.text);
    return withLead(answeredTurn(context, input.text.trim(), [recordFound(context.name, found, typed, context.answers)], context.misses), greetingLead(input.text));
  }

  return textTurn(context, pending, input.text);
}

/**
 * The question «دليلك» is waiting on: the first of the seven steps, in their fixed order (4.1), that has no answer yet (a
 * question already answered in an earlier free-text message is skipped, 4.3). Null when all seven are answered.
 * `completedBefore`: the account finished onboarding before step 7 existed (saved before 20 Nov 2026: completed, no
 * company): it stays complete, its company counts as «لا، مو الحين».
 */
export function pendingQuestion(answers: OnboardingAnswers, completedBefore = false, order: readonly OnboardingStepId[] = ONBOARDING_STEP_IDS): OnboardingStepId | null {
  for (const question of order) {
    if (question === "company" && completedBefore) continue;
    if (answers[question] === undefined) return question;
  }
  return null;
}

/**
 * The order of the questions after a CV (docs/ONBOARDING-FLOW.md, the owner's order): the CV's answers are confirmed first,
 * then the interest (asked from the CV's real skills), then whatever the CV did not state (city, education, major,
 * experience), then company and priority. The same seven answer slots: the engine and the reveal are unchanged.
 */
export const CV_QUESTION_ORDER: readonly OnboardingStepId[] = ["interest", "city", "education", "major", "experience", "company", "priority"];

/** The question order of a saved user: the CV order once a CV was read and its answers kept (not after «لا، بعدّل»). */
export function questionOrder(user: Pick<UserState, "onboarding">): readonly OnboardingStepId[] {
  return user.onboarding.cv === "analysed" && user.onboarding.cvPrefill?.confirmed === true ? CV_QUESTION_ORDER : ONBOARDING_STEP_IDS;
}

/** The step a saved user is on: null before the greeting (empty thread) and once onboarding is complete. */
export function pendingStep(user: Pick<UserState, "answers" | "onboarding" | "onboardingCompletedAt">): OnboardingStepId | null {
  return user.onboarding.thread.length === 0 ? null : pendingQuestion(user.answers, user.onboardingCompletedAt !== null, questionOrder(user));
}

/**
 * The interpreter's context from a saved user. `pending` is derived, never stored: null before the greeting (empty
 * thread), else pendingQuestion(answers). So after the greeting it is "city", which gives welcome question 1's chips,
 * lets a typed first answer be read against it (4.3 step 3), and lets resumeMessages re-ask after a reload.
 */
export function onboardingContext(user: UserState): OnboardingContext {
  const order = questionOrder(user);
  return {
    name: user.name,
    answers: user.answers,
    misses: user.onboarding.misses,
    pending: pendingStep(user),
    ...(order === CV_QUESTION_ORDER ? { order } : {}),
  };
}
