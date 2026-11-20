"use client";
// Owner: jobs. The apply sheet (spec 3.8, 7.4; ARCHITECTURE 9.2 "The apply sheet's DOM and layering").
// A Base UI Dialog, NOT the stock modal Sheet: it is portaled into the shell's #app-content (inside the content's stacking
// context, so the advisor panel narrating it, the toasts and the level-up stay above it, undimmed), and its backdrop and
// popup are limited to the content area with --content-inset-start / --content-inset-end. Phone (< 1024 px): it fills the
// content area between the top bar and the tab bar. Advisor mode: modal={false} (the composer's «إيقاف» stays reachable);
// user mode: modal="trap-focus". Both: disablePointerDismissal (a click on the panel never closes it or loses a note).
//
// What the user sees while «دليلك» fills it: the fields write themselves one after another with «دليلك»'s small mark moving
// from field to field (TypedField from the chat kit), the matching skills pop in, the note types by words, the CV line
// appears, the send button lights up and is pressed in front of the user, then the confirmation lands as a stamped receipt.
// 20 Nov 2026: a REAL posting is prepared, never sent: its buttons say «جهّز الطلب», and the confirmation shows where the
// job is posted and ONE big action, «افتح الإعلان الأصلي وقدّم» (the posting in a new tab, the note on the clipboard,
// then «نسخت لك رسالة التقديم»). The PRACTICE job keeps its moment: it is saved in «طلباتي» («احفظ الطلب» → «تم حفظ
// طلبك»), never said to be sent to anyone.
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { DaleelGlyph, RollingStatus, TypedField } from "@/components/chat";
import { IconArrowForward, IconCheck, IconClose, IconExternal, IconFile, IconInfo, IconSend, IconStop, IconWarning } from "@/components/icons";
import { useGo } from "@/components/motion";
import { SkillGem } from "@/components/game";
import { Button, Stamp, XpValue, buttonStyles, cn } from "@/components/ui";
import { JOB_SOURCE_COPY, SAMPLE_COPY, cvAttachmentLine } from "@/lib/copy";
import { MATCH_LINE, getJob, getSkill } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { rise, spring, tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { Gap, JobId, UserState } from "@/lib/types";

import { JobTag, useViewport } from "@/features/shared";

import { SHEET_COPY } from "./copy";
import { ApplyReward } from "./match-card";
import { LtrNumbers, isolateNumbers, stripIsolates } from "./parts";
import { STEP_ORDER, type ApplyFlow, type FormKey } from "./use-apply-flow";

const MARK_ID = "daleel-apply-mark";

/** The field to keep in view at each of «دليلك»'s steps. */
const FOLLOW: Partial<Record<(typeof STEP_ORDER)[number], string>> = {
  name: TID.apply.name,
  city: TID.apply.city,
  education: TID.apply.education,
  skills: TID.apply.skills,
  note: TID.apply.note,
  send: TID.apply.cv,
};

/** A block that rises in after `delay` seconds (a variant's own transition would swallow a delay prop). */
const riseAt = (delay: number) =>
  ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { ...tween.move, delay },
  }) as const;

export function ApplySheet({
  flow,
  jobId,
  user,
  match,
  have,
  onSeeGap,
}: {
  flow: ApplyFlow;
  jobId: JobId;
  user: UserState;
  match: number;
  have: Gap["have"];
  onSeeGap: () => void;
}): ReactNode {
  const job = getJob(jobId);
  const { desktop, wide } = useViewport();
  const advisorOpen = useUi((s) => s.advisorOpen);
  // #app-content mounts in the same commit as the page on a fresh load: look it up once mounted
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => setContainer(document.getElementById("app-content")), []);

  const advisor = flow.session?.mode === "advisor";
  const running = advisor && !flow.stopped && flow.stepId !== null;
  // a real job's run ends on the hand-off with the sheet still open: from then on it can be closed
  const closable = (!running || flow.ended) && flow.phase !== "sending";
  // the panel overlays the page between 1024 and 1279 px: keep the sheet clear of it, on the inline-start side
  const besidePanel = desktop && !wide && advisorOpen;

  if (container === null) return null;

  return (
    <Dialog.Root
      disablePointerDismissal
      modal={advisor ? false : "trap-focus"}
      onOpenChange={(next) => {
        if (!next) flow.close();
      }}
      open={flow.open}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop
          className="fixed inset-y-0 start-(--content-inset-start) end-(--content-inset-end) z-overlay bg-ink/30 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in data-starting-style:opacity-0"
          forceRender
        />
        <Dialog.Viewport
          className={cn(
            "fixed start-(--content-inset-start) end-(--content-inset-end) z-overlay flex",
            "top-(--shell-top) bottom-(--shell-bottom) items-start lg:inset-y-0 lg:px-6 lg:pt-[max(calc(var(--shell-top)+1rem),calc(50dvh-24rem))] lg:pb-6",
            besidePanel ? "justify-start" : "justify-center",
          )}
        >
          <Dialog.Popup
            className={cn(
              "flex h-full w-full flex-col overflow-hidden bg-surface text-fg outline-none",
              "lg:h-fit lg:max-h-[calc(100dvh-var(--shell-top)-2.5rem)] lg:w-[40rem] lg:rounded-sheet lg:border lg:border-border lg:shadow-float",
              "transition-[opacity,translate] duration-200 ease-out",
              "data-starting-style:translate-y-4 data-starting-style:opacity-0",
              "data-ending-style:translate-y-4 data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in",
            )}
            data-mode={flow.session?.mode}
            data-state={flow.phase}
            data-step={flow.stepId ?? undefined}
            data-testid={TID.apply.sheet}
            finalFocus={advisor ? false : undefined}
            initialFocus={advisor ? false : popupRef}
            ref={popupRef}
            tabIndex={-1}
          >
            <header className="flex items-start gap-3 border-b border-border px-5 pt-5 pb-4 lg:px-6">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-h3 text-fg">{SHEET_COPY.title(job.title)}</Dialog.Title>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-fg-2">
                  <span>{job.company}</span>
                  {job.real ? (
                    <>
                      <span aria-hidden>·</span>
                      <JobTag jobId={jobId} />
                    </>
                  ) : null}
                </p>
              </div>
              {closable ? (
                <Dialog.Close
                  aria-label={SHEET_COPY.close}
                  className="-me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:bg-hover hover:text-fg active:scale-[0.97] active:transition-none"
                >
                  <IconClose size={22} waypoint="off" />
                </Dialog.Close>
              ) : null}
            </header>

            <AnimatePresence initial={false} mode="wait">
              {flow.phase === "confirmed" && flow.application !== null ? (
                <motion.div
                  animate="show"
                  className="min-h-0 flex-1 overflow-y-auto"
                  exit="exit"
                  initial="hidden"
                  key="confirmed"
                  variants={rise}
                >
                  <Confirmation application={flow.application} jobId={jobId} onClose={flow.close} title={job.title} />
                </motion.div>
              ) : (
                <motion.div
                  animate="show"
                  className="flex min-h-0 flex-1 flex-col"
                  exit="exit"
                  initial={false}
                  key={`form-${flow.session?.key ?? 0}`}
                  variants={rise}
                >
                  <FormBody flow={flow} have={have} match={match} onSeeGap={onSeeGap} user={user} />
                </motion.div>
              )}
            </AnimatePresence>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function FormBody({
  flow,
  user,
  match,
  have,
  onSeeGap,
}: {
  flow: ApplyFlow;
  user: UserState;
  match: number;
  have: Gap["have"];
  onSeeGap: () => void;
}): ReactNode {
  const advisor = flow.session?.mode === "advisor";
  const reached = (id: (typeof STEP_ORDER)[number]) => !advisor || flow.stepIndex >= STEP_ORDER.indexOf(id);
  const at = (id: (typeof STEP_ORDER)[number]) => flow.filling && flow.stepId === id;
  const low = match < MATCH_LINE;
  const sending = flow.phase === "sending";
  const statusLine = advisor && !flow.stopped && flow.stepId !== null;
  // while «دليلك» fills, the flow owns the values (each passed field gets its whole value); a typed fragment is handed back
  // only when he was stopped, and the user's own edits always count
  const accept = !advisor || flow.stopped;
  const [noteDone, setNoteDone] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // while «دليلك» writes, keep the field he is on in view (the note and the CV line sit low on a 900 px screen)
  useEffect(() => {
    const body = bodyRef.current;
    const anchor = flow.stepId === null ? null : FOLLOW[flow.stepId];
    if (!body || !anchor) return;
    const el = body.querySelector<HTMLElement>(`[data-testid="${anchor}"]`);
    if (!el) return;
    const box = body.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top >= box.top + 8 && r.bottom <= box.bottom - 8) return;
    body.scrollTo({
      top: body.scrollTop + (r.bottom - box.bottom) + 24,
      behavior: "smooth",
    });
  }, [flow.stepId]);

  const field = (key: Exclude<FormKey, "note">, label: string, testId: string) => (
    <TypedField
      filling={at(key)}
      formValue={flow.values[key]}
      label={label}
      markId={MARK_ID}
      ms={400}
      onValueChange={(value) => {
        if (accept) flow.setValue(key, value);
      }}
      testId={testId}
      value={flow.targets[key]}
    />
  );

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto" ref={bodyRef}>
        {statusLine ? (
          <div
            className="sticky top-0 z-raised flex h-12 items-center gap-3 border-b border-border bg-bg px-5 lg:px-6"
            data-testid="apply-status"
          >
            <RollingStatus
              className="text-body"
              elapsedAfter={Number.POSITIVE_INFINITY}
              label={
                sending || flow.stepId === "done" ? (flow.real ? SHEET_COPY.preparingLine : SHEET_COPY.sendingLine) : SHEET_COPY.filling
              }
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-4 px-5 pt-4 pb-5 lg:px-6">
          {low ? (
            <div
              className="flex flex-col gap-3 rounded-card border border-warn-fg/30 bg-warn-soft px-4 py-3.5 sm:flex-row sm:items-center"
              data-testid={TID.apply.warning}
            >
              <p className="flex min-w-0 flex-1 items-start gap-2.5 text-small font-medium text-warn-fg">
                <IconWarning className="mt-0.5 shrink-0" size={20} waypoint="off" />
                <span>
                  <LtrNumbers text={SHEET_COPY.warning(match)} />
                </span>
              </p>
              <Button
                className="shrink-0 self-start sm:self-auto"
                data-testid={TID.apply.warningGap}
                disabled={flow.filling || sending}
                onClick={onSeeGap}
                size="sm"
                variant="secondary"
              >
                {SHEET_COPY.warningGap}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {field("name", SHEET_COPY.name, TID.apply.name)}
            {field("city", SHEET_COPY.city, TID.apply.city)}
          </div>
          {field("education", SHEET_COPY.education, TID.apply.education)}

          <SkillsField active={at("skills")} have={have} shown={reached("skills")} />

          <TypedField
            by="words"
            filling={at("note")}
            formValue={isolateNumbers(flow.values.note)}
            label={SHEET_COPY.note}
            markId={MARK_ID}
            ms={2000}
            multiline
            onDone={() => setNoteDone(true)}
            onValueChange={(value) => {
              if (accept) flow.setValue("note", stripIsolates(value));
            }}
            testId={TID.apply.note}
            value={isolateNumbers(flow.targets.note)}
          />

          <CvField
            line={cvAttachmentLine(user.cv)}
            shown={!advisor || noteDone || flow.stepIndex > STEP_ORDER.indexOf("note")}
          />
        </div>
      </div>

      {/* phone: the sheet ends above the tab bar, which already keeps clear of the home indicator (no safe-area padding
          here); with the keyboard up only the buttons stay, so the field being typed in keeps its room (globals.css kb-hide) */}
      <footer className="flex flex-col gap-3 border-t border-border px-5 pt-4 pb-5 lg:px-6 lg:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="kb-hide flex items-center gap-2 text-small text-fg-3">
          <IconInfo className="shrink-0" size={18} waypoint="muted" />
          {flow.real ? SAMPLE_COPY.applySheetReal : SAMPLE_COPY.applySheet}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className={
              sending
                ? "aria-disabled:border-accent-ink aria-disabled:bg-accent-press aria-disabled:text-on-accent"
                : undefined
            }
            data-testid={TID.apply.submit}
            disabled={flow.filling}
            icon={<IconSend size={20} />}
            loading={sending && !flow.pressed}
            onClick={flow.submit}
            pressed={flow.pressed}
          >
            {flow.real
              ? sending
                ? SHEET_COPY.preparing
                : low
                  ? SHEET_COPY.prepareAnyway
                  : SHEET_COPY.prepare
              : sending
                ? SHEET_COPY.sending
                : low
                  ? SHEET_COPY.submitAnyway
                  : SHEET_COPY.submit}
          </Button>
          {flow.filling ? (
            <Button
              data-testid={TID.apply.stop}
              icon={<IconStop size={20} />}
              iconPosition="start"
              onClick={flow.stop}
              variant="secondary"
            >
              {SHEET_COPY.stop}
            </Button>
          ) : !sending && !(advisor && !flow.stopped) ? (
            <Button data-testid={TID.apply.cancel} onClick={flow.close} variant="secondary">
              {SHEET_COPY.cancel}
            </Button>
          ) : null}
          {/* the reward this application pays, on the send row (docs/GAME-LAYER.md 5.3.6; spec 8.1: locked under 60%) */}
          {sending ? null : <ApplyReward className="kb-hide w-full justify-start sm:ms-auto sm:w-auto" match={match} />}
        </div>
      </footer>
    </>
  );
}

/** Field 4 «مهاراتك المطابقة»: the «ما لديك» skills as chips with their stars; they pop in one by one when «دليلك» fills. */
function SkillsField({ have, shown, active }: { have: Gap["have"]; shown: boolean; active: boolean }): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-small font-medium text-fg-2" id="apply-skills-label">
        {SHEET_COPY.skills}
      </span>
      <div
        aria-labelledby="apply-skills-label"
        className={cn(
          "flex min-h-13 w-full items-center gap-2.5 rounded-control border-[1.5px] border-border-strong bg-surface px-3 py-2 transition-[border-color] duration-200",
          active && "border-fg ring-3 ring-halo",
        )}
        data-testid={TID.apply.skills}
        data-value={shown ? have.length : 0}
        role="group"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {shown
            ? have.map((row, i) => (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex min-w-0"
                  data-skill={row.skill}
                  initial={active ? { opacity: 0, scale: 0.8 } : false}
                  key={row.skill}
                  transition={{
                    default: { ...spring.pop, delay: i * 0.12 },
                    opacity: { ...tween.fast, delay: i * 0.12 },
                  }}
                >
                  {/* the skill as the game's met gem (docs/GAME-LAYER.md 2): its name and its stars */}
                  <SkillGem have={row.held} name={getSkill(row.skill).name} need={row.need} />
                </motion.span>
              ))
            : null}
          {shown && have.length === 0 ? <span className="text-body text-fg-3">—</span> : null}
        </div>
        {active ? <DaleelGlyph framed layoutId={MARK_ID} size={26} state="working" title="دليلك يكتب" /> : null}
      </div>
    </div>
  );
}

/** Field 6 «السيرة الذاتية»: «مرفقة: {file name}» · «مرفقة: السيرة الجاهزة» · «لا توجد سيرة مرفقة». */
function CvField({ line, shown }: { line: string; shown: boolean }): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-small font-medium text-fg-2">{SHEET_COPY.cv}</span>
      <div
        className="flex h-13 items-center gap-2.5 rounded-control border-[1.5px] border-dashed border-border-strong bg-bg px-4"
        data-testid={TID.apply.cv}
      >
        <AnimatePresence initial={false}>
          {shown ? (
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="flex min-w-0 items-center gap-2.5 text-body text-fg"
              initial={{ opacity: 0, y: 6 }}
              key="cv"
              transition={tween.move}
            >
              <IconFile className="shrink-0 text-fg-2" size={20} waypoint="muted" />
              <bdi className="truncate">{line}</bdi>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The confirmation (spec 3.8), drawn as a receipt: the stamp lands (`sent-mark`), the number rolls in, the rows are
 * separated by the dotted trail: «رقم الطلب: DL-2026-0001» · «مطابقتك عند التقديم: 90%» · «+40 XP · تقديم مدروس» (or
 * «بدون نقاط: المطابقة أقل من 60%»).
 * - The practice job: «تم حفظ طلبك» · «تابع طلباتي» and «إغلاق».
 * - A real job: «طلبك جاهز» and «دليلك»'s line (prepared, saved, one step left), the receipt, where the job is posted, and
 *   the one big action «افتح الإعلان الأصلي وقدّم»: a link (so the new tab opens on the press itself) that also copies
 *   the note; then «نسخت لك رسالة التقديم». «تابع طلباتي» and «إغلاق» stay quieter.
 */
function Confirmation({
  application,
  jobId,
  title,
  onClose,
}: {
  application: NonNullable<ApplyFlow["application"]>;
  jobId: JobId;
  title: string;
  onClose: () => void;
}): ReactNode {
  const go = useGo();
  const job = getJob(jobId);
  const source = job.real ? job.source : undefined;
  const [copied, setCopied] = useState<boolean | null>(null);
  const openApplications = () => {
    onClose();
    go(hrefFor({ screen: "applications" }));
  };
  const openPosting = () => {
    void copyNote(application.note).then(setCopied);
  };
  return (
    <div
      className="flex flex-col items-center gap-6 px-5 pt-8 pb-7 lg:px-6"
      data-kind={source ? "real" : "practice"}
      data-testid={TID.apply.confirmation}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Stamp play size="md" tone="ok" />
        <h2 className="text-h2 text-fg">{source ? SHEET_COPY.prepared : SHEET_COPY.sent}</h2>
        <p className="text-small text-fg-2">
          <bdi>{title}</bdi>
        </p>
      </div>

      {source ? <DaleelLine testId="apply-prepared-line" text={SHEET_COPY.preparedLead} /> : null}

      <dl className="w-full max-w-md rounded-card border border-border bg-bg px-5">
        <ReceiptRow delay={0.25} label={SHEET_COPY.numberLabel} testId={TID.apply.number} value={application.number}>
          <span className="inline-flex h-[1.9em] overflow-hidden">
            <motion.bdi
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              className="inline-flex items-center text-title font-bold tabular-nums"
              dir="ltr"
              initial={{ y: "100%", opacity: 0, filter: "blur(2px)" }}
              transition={{ ...tween.move, delay: 0.35 }}
            >
              {application.number}
            </motion.bdi>
          </span>
        </ReceiptRow>
        <ReceiptRow delay={0.33} label={SHEET_COPY.matchAtSendLabel} value={application.matchAtSend}>
          <bdi className="text-title font-bold tabular-nums" dir="ltr">
            {formatPercent(application.matchAtSend)}
          </bdi>
        </ReceiptRow>
        <motion.div className="flex min-h-14 items-center justify-center gap-2 py-3 text-body" {...riseAt(0.41)}>
          {application.xpPaid > 0 ? (
            <>
              <XpValue gain value={application.xpPaid} />
              <span className="text-fg-3" aria-hidden>
                ·
              </span>
              <span className="font-medium text-fg">{SHEET_COPY.xpReason}</span>
            </>
          ) : (
            <span className="text-fg-2">
              <LtrNumbers text={SHEET_COPY.noXp} />
            </span>
          )}
        </motion.div>
      </dl>

      {source ? (
        <motion.div className="flex w-full max-w-md flex-col gap-3" data-testid="apply-handoff" {...riseAt(0.5)}>
          <p className="text-small text-fg-2">
            {SHEET_COPY.postedOn} <bdi className="font-medium text-fg">{source.site}</bdi>
            <span aria-hidden className="mx-1.5 text-fg-4">
              ·
            </span>
            <span>{job.company}</span>
          </p>
          <a
            className={buttonStyles({ size: "lg", className: "w-full" })}
            data-testid="apply-open-posting"
            href={source.url}
            onClick={openPosting}
            rel="noopener noreferrer"
            target="_blank"
          >
            <IconExternal size={22} />
            {JOB_SOURCE_COPY.openAndApply}
          </a>
          <AnimatePresence initial={false}>
            {copied === true ? (
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 text-body font-semibold text-ok-fg"
                data-testid="apply-note-copied"
                initial={{ opacity: 0, y: 6 }}
                key="copied"
                transition={tween.move}
              >
                <IconCheck size={20} strokeWidth={2.5} waypoint="off" />
                {JOB_SOURCE_COPY.noteCopied}
              </motion.p>
            ) : copied === false ? (
              <motion.p
                animate={{ opacity: 1 }}
                className="text-small text-fg-2"
                initial={{ opacity: 0 }}
                key="not-copied"
                transition={tween.move}
              >
                {SHEET_COPY.copyFailed}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}

      <div className="flex w-full max-w-md flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <Button
          data-testid={TID.apply.goApplications}
          icon={<IconArrowForward size={20} />}
          onClick={openApplications}
          variant={source ? "secondary" : "primary"}
        >
          {SHEET_COPY.goApplications}
        </Button>
        <Button data-testid={TID.apply.close} onClick={onClose} variant="secondary">
          {SHEET_COPY.close}
        </Button>
      </div>
    </div>
  );
}

/** One line in «دليلك»'s own voice (Najdi), with his mark: the confirmation's hand-off. */
function DaleelLine({ text, testId }: { text: string; testId: string }): ReactNode {
  return (
    <motion.p
      className="flex w-full max-w-md items-start gap-3 rounded-card border border-border bg-surface px-4 py-3.5 text-body text-fg"
      data-testid={testId}
      {...riseAt(0.45)}
    >
      <span className="mt-0.5 inline-flex shrink-0">
        <DaleelGlyph size={24} />
      </span>
      <span>{text}</span>
    </motion.p>
  );
}

/** The cover note onto the clipboard (the async API, else the old copy command). True when it worked. */
async function copyNote(note: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(note);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = note;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function ReceiptRow({
  label,
  value,
  testId,
  delay,
  children,
}: {
  label: string;
  value: string | number;
  testId?: string;
  delay: number;
  children: ReactNode;
}): ReactNode {
  return (
    <motion.div
      className="flex min-h-14 items-center justify-between gap-4 border-b-2 border-dotted border-border-strong py-2"
      data-testid={testId}
      data-value={value}
      {...riseAt(delay)}
    >
      <dt className="text-body text-fg-2">{label}</dt> <dd className="m-0">{children}</dd>
    </motion.div>
  );
}
