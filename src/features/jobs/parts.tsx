"use client";
// Owner: jobs. Small pieces shared by the list and the job page: the flags «هدفك» / «قدّمت», the field icon, the honest
// sample line, and the «ينقصك: …» line with every Latin skill name isolated for RTL.
import type { ComponentProps, ReactNode } from "react";

import {
  IconCheck,
  IconInfo,
  IconFieldBusiness,
  IconFieldCyberCloud,
  IconFieldData,
  IconFieldDesign,
  IconFieldHr,
  IconFieldMarketing,
  IconFieldProduct,
  IconFieldProfessional,
  IconFieldSalesSupply,
  WAVE2_FIELD_ICONS,
  IconFieldSoftware,
} from "@/components/icons";
import type { Requirement as GameRequirement } from "@/components/game";
import { NavLink } from "@/components/motion";
import { cn } from "@/components/ui";
import { BAND_LABEL, SAMPLE_COPY } from "@/lib/copy";
import { getJob, getSkill } from "@/lib/data";
import type { ExperienceBand, FieldId, JobId, SkillId, StarMap } from "@/lib/types";

import { LIST_COPY } from "./copy";

const FIELD_ICON = {
  data: IconFieldData,
  software: IconFieldSoftware,
  design: IconFieldDesign,
  marketing: IconFieldMarketing,
  business: IconFieldBusiness,
  hr: IconFieldHr,
  product: IconFieldProduct,
  "cyber-cloud": IconFieldCyberCloud,
  "sales-supply": IconFieldSalesSupply,
  ...WAVE2_FIELD_ICONS,
  professional: IconFieldProfessional,
} as const satisfies Record<FieldId, unknown>;

/** The field's own icon (quiet: its dot is not the waypoint). On a destination card it is the job's emblem. */
export function FieldIcon({
  field,
  size = 18,
  className,
}: {
  field: FieldId;
  size?: number;
  className?: string;
}): ReactNode {
  const Icon = FIELD_ICON[field];
  return <Icon className={className} size={size} waypoint="muted" />;
}

/**
 * «هدفك»: the user's own target, so it carries the one accent of the list (DESIGN 6.3: "their target's tag"), drawn as the
 * soft tint the kit reserves for the user's small marks, with the waypoint dot.
 */
export function TargetFlag({
  label = LIST_COPY.flagTarget,
  className,
}: {
  label?: string;
  className?: string;
}): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-tag bg-accent-soft ps-2 pe-2.5 text-caption font-semibold text-accent-fg",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
      {label}
    </span>
  );
}

/** «قدّمت»: a fact about the past, in ink with the success check. */
export function AppliedFlag({ className }: { className?: string }): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-tag border border-border-strong ps-1.5 pe-2 text-caption font-semibold text-fg-2",
        className,
      )}
    >
      <IconCheck className="text-ok-fg" size={15} strokeWidth={2.5} waypoint="off" />
      {LIST_COPY.flagApplied}
    </span>
  );
}

/**
 * The `/jobs` honesty line (20 Nov 2026): «إعلانات حقيقية جُمعت في 20 نوفمبر 2026، وقد يُغلق بعضها بعد ذلك. «محلل بيانات»
 * وظيفة تدريبية.», quiet, with the info mark.
 */
export function SampleLine(): ReactNode {
  return (
    <p className="flex items-start gap-2 text-small text-fg-3" data-testid="jobs-honesty">
      <IconInfo className="mt-0.5 shrink-0" size={18} waypoint="muted" />
      <LtrNumbers text={SAMPLE_COPY.jobsBanner} />
    </p>
  );
}

/**
 * Text with its numeric ranges and percentages isolated left to right. After Arabic letters digits resolve as Arabic
 * numbers (Unicode bidi rule W2), so a hyphen or a % beside them turns neutral and lands on the wrong side: «1-3» shows
 * as «3-1» and «70%» as «%70». An LTR isolate keeps «1-3» and «70%» (DESIGN 2.3).
 */
export function LtrNumbers({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\+?\d+(?:[-–]\d+)+|\+?\d+%)/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <bdi dir="ltr" key={i}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

/** A count never parts from its noun at a line break («3 نجوم», «12 ساعة»): a no-break space after the digits. */
export function keepCounts(text: string): string {
  return text.replace(/(\d+) (?=\S)/g, "$1\u00A0");
}

const ISOLATE = /(\+?\d+(?:[-–]\d+)+|\+?\d+%)/g;

/**
 * For text inside a form field, where no <bdi> can go: the same runs as LtrNumbers, wrapped in invisible Unicode
 * isolates (LRI … PDI), so «90%» does not show as «%90». Display only: `stripIsolates` before anything is kept.
 */
export function isolateNumbers(text: string): string {
  return stripIsolates(text).replace(ISOLATE, "\u2066$1\u2069");
}

export function stripIsolates(text: string): string {
  return text.replace(/[\u2066\u2069]/g, "");
}

/** A list of skill names in a sentence, joined by «، », each name isolated (Latin names keep their direction). */
export function SkillNames({ skills }: { skills: readonly SkillId[] }): ReactNode {
  return skills.map((skill, i) => (
    <span key={skill}>
      {i > 0 ? "، " : null}
      <bdi>{getSkill(skill).name}</bdi>
    </span>
  ));
}

/**
 * A job's five requirements as the game pieces draw them (the unlock meter's segments, the locked gems): the skill's name,
 * the stars held (capped at nothing: the meter caps the fill itself) and the stars required, in the job's order (spec 7.2).
 */
export function jobRequirements(jobId: JobId, stars: StarMap): GameRequirement[] {
  return getJob(jobId).requirements.map((r) => ({ name: getSkill(r.skill).name, have: stars[r.skill], need: r.stars }));
}

/** The experience label (spec 9.3) for a plain-text slot: «خبرة 1-3 سنوات» with the range isolated, so it never reads «3-1». */
export function experienceText(band: ExperienceBand): string {
  return isolateNumbers(BAND_LABEL[band]);
}

/**
 * A NavLink for a game piece's `render` slot (`<Tile render={<RouteLink href="/jobs/x" />}>`). The piece passes its face
 * as children; a render element that carries children of its own (even `{null}`) would win the merge and empty the card.
 */
export function RouteLink({ href, children, ...rest }: Omit<ComponentProps<"a">, "href"> & { href: string }): ReactNode {
  return (
    <NavLink {...rest} href={href}>
      {children}
    </NavLink>
  );
}
