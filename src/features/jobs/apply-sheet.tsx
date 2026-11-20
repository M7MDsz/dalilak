"use client";
// Owner: jobs. The apply sheet (spec 3.8, 7.4; ARCHITECTURE 9.2 "The apply sheet's DOM and layering").
// A Base UI Dialog, NOT the stock modal Sheet: it is portaled into the shell's #app-content (inside the content's stacking
// context, so the advisor panel narrating it, the toasts and the level-up stay above it, undimmed), and its backdrop and
// popup are limited to the content area with --content-inset-start / --content-inset-end. Phone (< 1024 px): it fills the
// content area between the top bar and the tab bar. Advisor mode: modal={false} (the composer's «إيقاف» stays reachable);
// user mode: modal="trap-focus". Both: disablePointerDismissal (a click on the panel never closes it or loses a note).
//
// What the user sees while «دليل» fills it: the fields write themselves one after another with «دليل»'s small mark moving
// from field to field (TypedField from the chat kit), the matching skills pop in, the note types by words, the CV line
// appears, the send button lights up and is pressed in front of the user, then the confirmation lands as a stamped receipt.
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { DaleelGlyph, RollingStatus, TypedField } from "@/components/chat";
import { IconArrowForward, IconCheck, IconClose, IconCompany, IconFile, IconInfo, IconSend, IconStop, IconWarning } from "@/components/icons";
import { useGo, useInstant } from "@/components/motion";
import { SkillGem } from "@/components/game";
import { Button, RunningArc, SampleTag, Stamp, XpValue, cn } from "@/components/ui";
import { SAMPLE_COPY, cvAttachmentLine } from "@/lib/copy";
import { APPLY_SITE_MS, APPLY_SITES, MATCH_LINE, getJob, getSkill } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { rise, spring, tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { Gap, JobId, UserState } from "@/lib/types";

import { useViewport } from "@/features/shared";

import { SHEET_COPY } from "./copy";
import { ApplyReward } from "./match-card";
import { LtrNumbers, isolateNumbers, stripIsolates } from "./parts";
import { STEP_ORDER, type ApplyFlow, type FormKey } from "./use-apply-flow";

const MARK_ID = "daleel-apply-mark";

/** The field to keep in view at each of «دليل»'s steps. */
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
  const closable = !running && flow.phase !== "sending";
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
                  <span aria-hidden>·</span>
                  <SampleTag kind="company" />
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
                  <Confirmation application={flow.application} onClose={flow.close} title={job.title} />
                </motion.div>
              ) : flow.stepId === "sites" ? (
                <motion.div
                  animate="show"
                  className="min-h-0 flex-1 overflow-y-auto"
                  exit="exit"
                  initial="hidden"
                  key="sites"
                  variants={rise}
                >
                  <SitesRun />
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
  // while «دليل» fills, the flow owns the values (each passed field gets its whole value); a typed fragment is handed back
  // only when he was stopped, and the user's own edits always count
  const accept = !advisor || flow.stopped;
  const [noteDone, setNoteDone] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // while «دليل» writes, keep the field he is on in view (the note and the CV line sit low on a 900 px screen)
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
              label={sending || flow.stepId === "done" ? SHEET_COPY.sendingLine : SHEET_COPY.filling}
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

      <footer className="flex flex-col gap-3 border-t border-border px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-6">
        <p className="flex items-center gap-2 text-small text-fg-3">
          <IconInfo className="shrink-0" size={18} waypoint="muted" />
          {SAMPLE_COPY.applySheet}
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
            {sending ? SHEET_COPY.sending : low ? SHEET_COPY.submitAnyway : SHEET_COPY.submit}
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
          {sending ? null : <ApplyReward className="w-full justify-start sm:ms-auto sm:w-auto" match={match} />}
        </div>
      </footer>
    </>
  );
}

/** Field 4 «مهاراتك المطابقة»: the «ما لديك» skills as chips with their stars; they pop in one by one when «دليل» fills. */
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
        {active ? <DaleelGlyph framed layoutId={MARK_ID} size={26} state="working" title="دليل يكتب" /> : null}
      </div>
    </div>
  );
}

/** Field 6 «السيرة الذاتية»: «مرفقة: {file name}» · «مرفقة: السيرة التجريبية» · «لا توجد سيرة مرفقة». */
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
 * The confirmation (spec 3.8): «تم إرسال طلبك» · «رقم الطلب: DL-2026-0001» · «مطابقتك عند التقديم: 90%» · «+40 XP ·
 * تقديم مدروس» (or «بدون نقاط: المطابقة أقل من 60%») · «تابع طلباتي» and «إغلاق». Drawn as a receipt: the stamp lands
 * (`sent-mark`), the number rolls in, the rows are separated by the dotted trail.
 */
/**
 * After the in-app send, «دليل» applies on the other sites one after another (APPLY_SITES; Mohammed, 18 Nov 2026: "show
 * that he will apply for in multiple sites"). A simulation that says so: names only, nothing leaves the laptop. Each row
 * waits its turn, fills (the running arc) and is sent; the whole step is APPLY_SITES.length × APPLY_SITE_MS long, and the
 * last row turns green just before the confirmation arrives. Reduced motion: every row is already sent.
 */
function SitesRun(): ReactNode {
  const instant = useInstant();
  const [at, setAt] = useState(instant ? APPLY_SITES.length : 0);
  useEffect(() => {
    if (at >= APPLY_SITES.length) return;
    const timer = window.setTimeout(() => setAt((n) => n + 1), APPLY_SITE_MS - 40);
    return () => window.clearTimeout(timer);
  }, [at]);
  return (
    <div className="flex flex-col gap-4 px-5 pt-5 pb-6 lg:px-6" data-testid="apply-sites">
      <p className="inline-flex items-center gap-2 text-body font-semibold text-ok-fg">
        <IconCheck size={20} strokeWidth={2.5} waypoint="off" />
        {SHEET_COPY.sitesDone}
      </p>
      <p className="text-title font-bold text-fg">{SHEET_COPY.sitesTitle}</p>
      <ul className="flex flex-col gap-2">
        {APPLY_SITES.map((site, index) => {
          const state = index < at ? "sent" : index === at ? "filling" : "waiting";
          return (
            <motion.li
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex h-14 items-center gap-3 rounded-control border px-4 transition-[background-color,border-color] duration-200 ease-out",
                state === "sent" ? "border-transparent bg-ok-soft" : state === "filling" ? "border-fg bg-surface" : "border-border bg-bg",
              )}
              data-state={state}
              data-testid={`apply-site-${site.id}`}
              initial={instant ? false : { opacity: 0, y: 6 }}
              key={site.id}
              transition={{ ...tween.move, delay: instant ? 0 : 0.05 * index }}
            >
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-fg-2">
                <IconCompany size={18} waypoint="muted" />
              </span>
              <bdi className="min-w-0 flex-1 truncate text-body font-semibold text-fg">{site.name}</bdi>
              {state === "sent" ? (
                <span className="inline-flex items-center gap-1.5 text-small font-semibold text-ok-fg">
                  <IconCheck size={18} strokeWidth={2.5} waypoint="off" />
                  {SHEET_COPY.siteSent}
                </span>
              ) : state === "filling" ? (
                <span className="inline-flex items-center gap-2 text-small text-fg-2">
                  <RunningArc size={16} />
                  {SHEET_COPY.siteFilling}
                </span>
              ) : (
                <span className="text-small text-fg-3">{SHEET_COPY.siteWaiting}</span>
              )}
            </motion.li>
          );
        })}
      </ul>
      <p className="flex items-start gap-2 text-small text-fg-3">
        <IconInfo className="mt-0.5 shrink-0" size={18} waypoint="off" />
        <span>{SHEET_COPY.sitesNote}</span>
      </p>
    </div>
  );
}

function Confirmation({
  application,
  title,
  onClose,
}: {
  application: NonNullable<ApplyFlow["application"]>;
  title: string;
  onClose: () => void;
}): ReactNode {
  const go = useGo();
  const openApplications = () => {
    onClose();
    go(hrefFor({ screen: "applications" }));
  };
  return (
    <div className="flex flex-col items-center gap-6 px-5 pt-8 pb-7 lg:px-6" data-testid={TID.apply.confirmation}>
      <div className="flex flex-col items-center gap-3 text-center">
        <Stamp play size="md" tone="ok" />
        <h2 className="text-h2 text-fg">{SHEET_COPY.sent}</h2>
        <p className="text-small text-fg-2">
          <bdi>{title}</bdi>
        </p>
      </div>

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
        {application.by === "advisor" ? (
          <motion.div
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-dotted border-border-strong py-3"
            data-testid="apply-sites-sent"
            {...riseAt(0.37)}
          >
            <span className="text-body text-fg-2">{SHEET_COPY.sitesLabel}</span>
            <span className="flex flex-wrap justify-end gap-1.5">
              {[SHEET_COPY.siteDalilak, ...APPLY_SITES.map((s) => s.name)].map((name) => (
                <span className="inline-flex h-7 items-center gap-1 rounded-full bg-ok-soft px-2.5 text-caption font-semibold text-ok-fg" key={name}>
                  <IconCheck size={14} strokeWidth={2.5} waypoint="off" />
                  <bdi>{name}</bdi>
                </span>
              ))}
            </span>
          </motion.div>
        ) : null}
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

      <div className="flex w-full max-w-md flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <Button data-testid={TID.apply.goApplications} icon={<IconArrowForward size={20} />} onClick={openApplications}>
          {SHEET_COPY.goApplications}
        </Button>
        <Button data-testid={TID.apply.close} onClick={onClose} variant="secondary">
          {SHEET_COPY.close}
        </Button>
      </div>
    </div>
  );
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
