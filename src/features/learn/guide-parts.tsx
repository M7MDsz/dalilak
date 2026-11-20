"use client";
// Owner: learn. The pieces of a skill's learning guide (the guide page `/learn/[id]` and the list's cards): the top pick
// as the hero card («ابدأ بهذا»), the quieter alternatives («خيارات ثانية», closed by default), the people to follow
// («مين تتابع», each with small links to their other profiles), what to read («وش تقرأ»), the certificate that proves the
// skill («الشهادة اللي تثبت مهارتك», or an honest «no recognised certificate» with the practical proof instead), the plan
// stepper (① تعلّم → ② طبّق → ③ خلّصتها) and the facts of a course as quiet chips. Data comes from @/lib/data guides (real items, links opened 20 Nov 2026); nothing here invents a
// number: hours, price and certificate show only when the guide has them. Every outside link opens in a new tab.
import { useState, type ReactNode } from "react";

import { IconCheck, IconChevronDown, IconExternal } from "@/components/icons";
import { Collapse } from "@/components/motion";
import { cn } from "@/components/ui";
import { hoursText } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import type { GuideArticle, GuideCertification, GuideCourse, GuidePerson, GuidePersonLinks } from "@/lib/data";

import { COURSE_COPY, certFeeLine, othersLine, profileLinkLabel } from "./copy";

/** Hosts whose platform name is clearer than the provider line («Macquarie University (Coursera)» → Coursera). */
const PLATFORM_BY_HOST: readonly (readonly [RegExp, string])[] = [
  [/(^|\.)coursera\.org$/, "Coursera"],
  [/(^|\.)learn\.microsoft\.com$/, "Microsoft Learn"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
  [/(^|\.)edx\.org$/, "edX"],
  [/(^|\.)udemy\.com$/, "Udemy"],
  [/(^|\.)linkedin\.com$/, "LinkedIn Learning"],
  [/(^|\.)khanacademy\.org$/, "Khan Academy"],
  [/(^|\.)freecodecamp\.org$/, "freeCodeCamp"],
  [/(^|\.)skillshop\.withgoogle\.com$/, "Google Skillshop"],
  [/(^|\.)grow\.google$/, "Google"],
  [/(^|\.)skillshop\.exceedlms\.com$/, "Google Skillshop"],
  [/(^|\.)academy\.hubspot\.com$/, "HubSpot Academy"],
  [/(^|\.)doroob\.sa$/, "دروب"],
  [/(^|\.)edraak\.org$/, "إدراك"],
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** The platform a course lives on (for «ابدأ التعلّم على …»): a known host, else the provider before its brackets. */
export function platformOf(course: GuideCourse): string {
  const host = hostOf(course.url);
  for (const [re, name] of PLATFORM_BY_HOST) if (re.test(host)) return name;
  return course.provider.replace(/\s*\(.*\)\s*$/, "").trim() || course.provider;
}

/** The provider's line under the platform: what the provider adds beyond the platform's name, or null. */
function providerNote(course: GuideCourse, platform: string): string | null {
  const plain = course.provider.trim();
  if (plain === platform) return null;
  const inner = /\(([^)]+)\)\s*$/.exec(plain)?.[1]?.trim() ?? null;
  const outer = plain.replace(/\s*\(.*\)\s*$/, "").trim();
  if (outer === platform) return inner;
  if (inner === platform || inner?.startsWith(`${platform} `)) return outer;
  return plain;
}

/** Up to two letters for a monogram tile («Microsoft Learn» → «ML», «منذر …» → «م»). */
export function monogram(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .split(/[\s&·/,-]+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "•";
  const first = words[0] ?? "";
  if (/^[؀-ۿ]/.test(first)) return first.charAt(0);
  const letters = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return letters || "•";
}

function Monogram({ name, size = "md" }: { readonly name: string; readonly size?: "sm" | "md" }): ReactNode {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-control border border-border-strong bg-surface-2 font-semibold text-fg",
        size === "md" ? "size-12 text-body" : "size-9 rounded-full text-small",
      )}
      dir="auto"
    >
      {monogram(name)}
    </span>
  );
}

function FactChip({ children }: { readonly children: ReactNode }): ReactNode {
  return <span className="inline-flex h-7 items-center rounded-full border border-border px-2.5 text-small font-medium whitespace-nowrap text-fg-2">{children}</span>;
}

const PRICE_LABEL = { free: "مجاني", paid: "مدفوع", free_to_audit: "مجاني، والشهادة مدفوعة" } as const;

/** The facts of a course, as quiet chips: language, price, hours, certificate (each only when known). */
export function CourseFacts({ course, className }: { readonly course: GuideCourse; readonly className?: string }): ReactNode {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <FactChip>{course.lang === "ar" ? "عربي" : "English"}</FactChip>
      {course.price !== null ? <FactChip>{PRICE_LABEL[course.price]}</FactChip> : null}
      {course.hours !== null ? <FactChip>{hoursText(Math.round(course.hours))}</FactChip> : null}
      {course.certificate !== null ? <FactChip>{course.certificate ? "بشهادة" : "بدون شهادة"}</FactChip> : null}
      {course.financialAid === true && course.price !== "free" ? <FactChip>{COURSE_COPY.financialAid}</FactChip> : null}
    </div>
  );
}

/** An outside link (new tab), with the external mark after its words. */
export function OutLink({
  href,
  children,
  className,
  onClick,
  testId,
  "aria-label": ariaLabel,
  title,
  "data-main": main,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly onClick?: () => void;
  readonly testId?: string;
  readonly "aria-label"?: string;
  readonly title?: string;
  /** The row's main link (the person rows draw their border on its hover). */
  readonly "data-main"?: boolean;
}): ReactNode {
  return (
    <a
      aria-label={ariaLabel}
      className={className}
      data-main={main ? "" : undefined}
      data-testid={testId}
      href={href}
      onClick={onClick}
      rel="noopener noreferrer"
      target="_blank"
      title={title}
    >
      {children}
    </a>
  );
}

const linkText =
  "font-medium text-fg underline decoration-border-strong decoration-dotted underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-fg";

/**
 * The hero card: «ابدأ بهذا · اخترناه لك», the platform tile and name, the course title, its one-line why, the facts, and
 * the actions the page passes (the step's one primary, or a quieter open link, plus the «next step» link).
 */
export function TopPickCard({ course, current, actions, done }: { readonly course: GuideCourse; readonly current: boolean; readonly actions: ReactNode; readonly done: boolean }): ReactNode {
  const platform = platformOf(course);
  const note = providerNote(course, platform);
  return (
    <section
      aria-labelledby="guide-top-pick"
      className={cn("flex flex-col gap-4 rounded-card border bg-surface p-card", current ? "border-fg border-[1.5px]" : "border-border")}
      data-testid="course-top-pick"
    >
      <p className="flex items-center gap-2 text-small font-semibold text-fg-2">
        {done ? <IconCheck className="text-ok-fg" size={18} waypoint="off" /> : <span aria-hidden className={cn("size-1.5 rounded-full", current ? "bg-accent" : "bg-fg-3")} />}
        <span className={current ? "text-accent-fg" : undefined}>{COURSE_COPY.topPick}</span>
        <span aria-hidden>·</span>
        <span className="font-medium">{COURSE_COPY.topPickNote}</span>
      </p>
      <div className="flex items-center gap-3">
        <Monogram name={platform} />
        <div className="flex min-w-0 flex-col">
          <span className="text-body font-semibold text-fg">
            <bdi>{platform}</bdi>
          </span>
          {note ? (
            <span className="truncate text-small text-fg-3">
              <bdi>{note}</bdi>
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-h3 text-balance text-fg @min-[900px]/content:text-h2" id="guide-top-pick">
          <bdi>{course.title}</bdi>
        </h2>
        <p className="max-w-[44rem] text-body text-fg-2">{course.why}</p>
      </div>
      <CourseFacts course={course} />
      {actions}
    </section>
  );
}

/** «خيارات ثانية (2)»: one quiet line, closed by default; open, each option as a row with its facts and link. */
export function OtherOptions({ options }: { readonly options: readonly GuideCourse[] }): ReactNode {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  const summary = options.map((o) => `${platformOf(o)} ${o.lang === "ar" ? "بالعربي" : "بالإنجليزي"}`).join(" · ");
  return (
    <section className="rounded-card border border-border bg-surface" data-testid="course-others">
      <button
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-card py-3 text-start"
        data-testid="course-others-toggle"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="text-body font-semibold text-fg">{othersLine(options.length)}</span>
        <span className="hidden min-w-0 flex-1 truncate text-small text-fg-3 sm:inline">{summary}</span>
        <span className="ms-auto inline-flex items-center gap-1 text-small font-medium text-fg-2">
          {open ? COURSE_COPY.othersClose : COURSE_COPY.othersOpen}
          <IconChevronDown className={cn("transition-transform duration-200 ease-out", open && "rotate-180")} size={18} waypoint="off" />
        </span>
      </button>
      <Collapse open={open}>
        <ul className="flex flex-col border-t border-border">
          {options.map((o) => (
            <li className="flex flex-col gap-2 border-b border-border px-card py-4 last:border-b-0" key={o.url}>
              <div className="flex items-start gap-3">
                <Monogram name={platformOf(o)} size="sm" />
                <div className="flex min-w-0 flex-col gap-1">
                  <OutLink className={cn(linkText, "text-body")} href={o.url}>
                    <bdi>{o.title}</bdi> <IconExternal className="inline align-[-0.15em] text-fg-3" size={16} waypoint="off" />
                  </OutLink>
                  <span className="text-small text-fg-3">
                    <bdi>{o.provider}</bdi>
                  </span>
                  <p className="text-small text-fg-2">{o.why}</p>
                </div>
              </div>
              <CourseFacts className="ps-12" course={o} />
            </li>
          ))}
        </ul>
      </Collapse>
    </section>
  );
}

/** «مين تتابع»: one row per person (monogram, name, platform, one line), the row is the link. */
export function PeopleList({ people }: { readonly people: readonly GuidePerson[] }): ReactNode {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="guide-people" className="flex flex-col gap-3" data-testid="course-people">
      <h2 className="text-title text-fg" id="guide-people">
        {COURSE_COPY.people}
      </h2>
      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li
            className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-3.5 transition-[border-color] duration-200 has-[a[data-main]:hover]:border-fg"
            data-testid="course-person"
            key={p.url}
          >
            <OutLink className="group flex items-start gap-3" data-main href={p.url}>
              <Monogram name={p.name} size="sm" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-semibold text-fg">
                  <bdi>{p.name}</bdi>
                </span>
                <span className="text-small text-fg-3">
                  <bdi>{p.platform}</bdi>
                </span>
                <span className="text-small text-fg-2">{p.why}</span>
              </span>
              <IconExternal className="ms-auto mt-1 shrink-0 text-fg-3 group-hover:text-fg" size={16} waypoint="off" />
            </OutLink>
            <PersonProfiles person={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** «وش تقرأ»: link rows with the site and what you get from each. */
export function ArticleList({ articles }: { readonly articles: readonly GuideArticle[] }): ReactNode {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="guide-read" className="flex flex-col gap-3" data-testid="course-articles">
      <h2 className="text-title text-fg" id="guide-read">
        {COURSE_COPY.read}
      </h2>
      <ul className="flex flex-col border-t border-border">
        {articles.map((a) => (
          <li className="border-b border-border py-3" key={a.url}>
            <OutLink className="group flex flex-col gap-1" href={a.url}>
              <span className={cn(linkText, "text-body group-hover:decoration-fg")}>
                <bdi>{a.title}</bdi> <IconExternal className="inline align-[-0.15em] text-fg-3" size={16} waypoint="off" />
              </span>
              <span className="text-small text-fg-3">
                <bdi dir="ltr">{a.site}</bdi> · {a.why}
              </span>
            </OutLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type PlanStepId = "learn" | "apply" | "finish";
export type PlanStepState = "done" | "current" | "upcoming";

/** The plan as a compact stepper: ① تعلّم ┄ ② طبّق ┄ ③ خلّصتها (two steps when the guide has no proof task). */
export function PlanStepper({ steps }: { readonly steps: readonly { readonly id: PlanStepId; readonly state: PlanStepState }[] }): ReactNode {
  return (
    <ol aria-label={COURSE_COPY.planLabel} className="flex flex-wrap items-center gap-y-2" data-testid="course-plan">
      {steps.map((s, i) => (
        <li className="flex items-center" data-state={s.state} key={s.id}>
          {i > 0 ? <span aria-hidden className={cn("mx-1.5 w-5 border-t-[1.5px] sm:w-8", s.state === "upcoming" ? "border-dashed border-border-strong" : "border-fg")} /> : null}
          <span
            aria-current={s.state === "current" ? "step" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] ps-1.5 pe-4 text-body font-semibold",
              s.state === "current" ? "border-fg text-fg" : s.state === "done" ? "border-border-strong text-fg-2" : "border-border text-fg-3",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "inline-grid size-7 place-items-center rounded-full text-small",
                s.state === "current" ? "bg-solid text-on-solid" : s.state === "done" ? "bg-ok-bg text-ok-fg" : "border border-border-strong",
              )}
            >
              {s.state === "done" ? <IconCheck size={16} waypoint="off" /> : formatNumber(i + 1)}
            </span>
            {COURSE_COPY.plan[s.id]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A step card of the plan (② طبّق, ③ خلّصتها): dashed while it waits, drawn when it is the current one. */
export function PlanCard({
  n,
  title,
  state,
  children,
  testId,
}: {
  readonly n: number;
  readonly title: string;
  readonly state: PlanStepState;
  readonly children: ReactNode;
  readonly testId?: string;
}): ReactNode {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card p-card",
        state === "current" ? "border-[1.5px] border-fg bg-surface" : state === "done" ? "border border-border bg-surface" : "border-[1.5px] border-dashed border-border-strong",
      )}
      data-state={state}
      data-testid={testId}
    >
      <h2 className="flex items-center gap-2 text-title text-fg">
        {state === "done" ? <IconCheck className="text-ok-fg" size={20} waypoint="off" /> : <span className="text-fg-3">{formatNumber(n)}</span>}
        <span aria-hidden className="text-fg-3">
          ·
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── a person's other profiles ─────────────────────────────────────────────────────────────────────────────────────

const PROFILE_ORDER = ["linkedin", "x", "youtube", "github", "website"] as const;
type ProfileKind = (typeof PROFILE_ORDER)[number];

const BRAND_PATH: Record<Exclude<ProfileKind, "website">, string> = {
  linkedin:
    "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  x: "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z",
  youtube:
    "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z",
  github:
    "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3",
};

/** Monochrome brand marks (filled, currentColor) and a stroked globe for a website. */
function ProfileMark({ kind }: { readonly kind: ProfileKind }): ReactNode {
  if (kind === "website") {
    return (
      <svg aria-hidden fill="none" height={16} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.75 5.7 3.75 9S14.5 18.3 12 21c-2.5-2.7-3.75-5.7-3.75-9S9.5 5.7 12 3Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden fill="currentColor" height={15} viewBox="0 0 24 24" width={15}>
      <path d={BRAND_PATH[kind]} />
    </svg>
  );
}

/** One person's (or one member's) profile icons, in a fixed order, each a quiet round link (new tab). */
function ProfileIcons({ links, name }: { readonly links: GuidePersonLinks; readonly name: string }): ReactNode {
  return (
    <>
      {PROFILE_ORDER.map((kind) => {
        const href = links[kind];
        if (!href) return null;
        const label = profileLinkLabel(kind, name);
        return (
          <OutLink
            aria-label={label}
            className="tap-area relative inline-grid size-9 place-items-center rounded-full border border-border text-fg-2 transition-[border-color,color] duration-200 hover:border-fg hover:text-fg"
            href={href}
            key={kind}
            title={label}
          >
            <ProfileMark kind={kind} />
          </OutLink>
        );
      })}
    </>
  );
}

/** Under a person row: the shared profiles, then each member's own (a two-person entry), aligned with the name. */
function PersonProfiles({ person }: { readonly person: GuidePerson }): ReactNode {
  const members = person.members ?? [];
  if (!person.links && members.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 ps-12" data-testid="course-person-links">
      {person.links ? (
        <div aria-label={`${COURSE_COPY.personLinks} ${person.name}`} className="flex flex-wrap items-center gap-1.5" role="group">
          <ProfileIcons links={person.links} name={person.name} />
        </div>
      ) : null}
      {members.map((m) => (
        <div aria-label={`${COURSE_COPY.personLinks} ${m.name}`} className="flex flex-col gap-1.5" key={m.name} role="group">
          <span className="text-small font-medium text-fg-3">
            <bdi>{m.name}</bdi>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <ProfileIcons links={m.links} name={m.name} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── «الشهادة اللي تثبت مهارتك» ──────────────────────────────────────────────────────────────────────────────────────

function Chip({ children, strong = false }: { readonly children: ReactNode; readonly strong?: boolean }): ReactNode {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full border px-2.5 text-small font-medium whitespace-nowrap", strong ? "border-fg text-fg" : "border-border text-fg-2")}>
      {children}
    </span>
  );
}

/**
 * The certificate block: issuer, name, «رسمي» + exam code + level chips, why it counts, the fee as the official page
 * states it («الرسوم: … (حسب الموقع الرسمي)»), and the two links (how to prepare, the certificate's page).
 * When the skill has no recognised certificate it says so and gives the practical proof instead.
 */
export function CertificateCard({ cert }: { readonly cert: GuideCertification }): ReactNode {
  if (cert.kind === "none") {
    return (
      <section aria-labelledby="guide-cert" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-card" data-kind="none" data-testid="course-certification">
        <h2 className="text-title text-fg" id="guide-cert">
          {COURSE_COPY.cert.heading}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{COURSE_COPY.cert.none}</Chip>
        </div>
        <p className="max-w-[44rem] text-body text-fg-2">{cert.why}</p>
        <p className="max-w-[44rem] text-body text-fg">
          <span className="font-semibold">{COURSE_COPY.cert.insteadLabel}</span> {cert.proof}
        </p>
        {cert.proofUrl ? (
          <OutLink className={cn(linkText, "self-start text-small")} href={cert.proofUrl}>
            {COURSE_COPY.cert.proofCourse} <IconExternal className="inline align-[-0.15em] text-fg-3" size={16} waypoint="off" />
          </OutLink>
        ) : null}
      </section>
    );
  }
  const fee = certFeeLine(cert.fee, cert.feeVaries);
  return (
    <section aria-labelledby="guide-cert" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-card" data-kind="official" data-testid="course-certification">
      <h2 className="text-title text-fg" id="guide-cert">
        {COURSE_COPY.cert.heading}
      </h2>
      <div className="flex items-start gap-3">
        <Monogram name={cert.issuer} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-small font-medium text-fg-3">
            <bdi>{cert.issuer}</bdi> · {cert.type === "exam" ? COURSE_COPY.cert.exam : COURSE_COPY.cert.program}
          </span>
          <h3 className="text-body font-semibold text-balance text-fg">
            <bdi>{cert.name}</bdi>
          </h3>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip strong>{COURSE_COPY.cert.official}</Chip>
        {cert.code ? (
          <Chip>
            <bdi dir="ltr">{cert.code}</bdi>
          </Chip>
        ) : null}
        <Chip>{COURSE_COPY.cert.level[cert.level]}</Chip>
      </div>
      <p className="max-w-[44rem] text-body text-fg-2">{cert.why}</p>
      {fee ? (
        <p className="text-small text-fg-2" data-testid="course-certification-fee">
          {fee}
        </p>
      ) : null}
      <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <OutLink className={cn(linkText, "text-body")} href={cert.prepUrl}>
            {COURSE_COPY.cert.prep} <IconExternal className="inline align-[-0.15em] text-fg-3" size={16} waypoint="off" />
          </OutLink>
          <span className="text-small text-fg-3">{cert.prepLabel}</span>
        </p>
        <OutLink className={cn(linkText, "self-start text-body")} href={cert.url}>
          {COURSE_COPY.cert.page} <IconExternal className="inline align-[-0.15em] text-fg-3" size={16} waypoint="off" />
        </OutLink>
      </div>
    </section>
  );
}
