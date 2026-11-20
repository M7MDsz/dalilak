"use client";
// Owner: learn. A course as a quest (docs/GAME-LAYER.md 3, 5.5, 5.6): the catalogue's states mapped onto the game's five,
// the ribbon words (the spec's own labels wherever the spec names one), the field emblem of a course off the path, and the
// source line of a credited star. The catalogue cards and the course page both read these, so one course is drawn the
// same way in both places.
import type { ComponentProps, ComponentType, ReactNode } from "react";

import type { GameState } from "@/components/game";
import {
  IconFieldBusiness,
  IconFieldCyberCloud,
  IconFieldData,
  IconFieldDesign,
  IconFieldHr,
  IconFieldMarketing,
  IconFieldProduct,
  IconFieldProfessional,
  IconFieldSalesSupply,
  IconFieldSoftware,
} from "@/components/icons";
import type { IconProps } from "@/components/icons/icon-base";
import { NavLink } from "@/components/motion";
import { COURSE_STATE_LABEL, dayMonth, guideTitle } from "@/lib/copy";
import type { CourseId, CourseStateInfo, FieldId, NextStep } from "@/lib/types";

import { completedOnLine, COURSE_COPY, fromCourseLine } from "./copy";

export const FIELD_ICON = {
  data: IconFieldData,
  software: IconFieldSoftware,
  design: IconFieldDesign,
  marketing: IconFieldMarketing,
  business: IconFieldBusiness,
  hr: IconFieldHr,
  product: IconFieldProduct,
  "cyber-cloud": IconFieldCyberCloud,
  "sales-supply": IconFieldSalesSupply,
  professional: IconFieldProfessional,
} as const satisfies Record<FieldId, ComponentType<IconProps>>;

/** A quest's link: a NavLink (the route transition plays) whose children come from the card it renders. */
export function QuestLink({ href, children, ...rest }: Omit<ComponentProps<"a">, "href"> & { readonly href: string }): ReactNode {
  return (
    <NavLink {...rest} href={href}>
      {children}
    </NavLink>
  );
}

/** The course the next step (spec 2.8) is about: rule 2 «أكمل …» or rule 3 «ابدأ …». At most one per screen. */
export function nextCourseOf(step: NextStep): CourseId | null {
  return step.rule === 2 || step.rule === 3 ? step.courseId : null;
}

/**
 * GAME-LAYER 5.5: available → available (next when it is the next step's course) · started → next (the next step's,
 * rule 2) or progress · completed and credited → done · locked → locked.
 */
export function questStateOf(info: CourseStateInfo, isNext: boolean): GameState {
  switch (info.state) {
    case "available":
      return isNext ? "next" : "available";
    case "started":
      return isNext ? "next" : "progress";
    case "completed":
    case "credited":
      return "done";
    case "locked":
      return "locked";
  }
}

/**
 * The ribbon's words where the spec names them (3.10): «بدأتها» for a started step (instead of the layer's
 * «جارية»). Undefined leaves the quest's own («التالية», «متاحة», «مكتملة», «مثبتة», «مقفلة»).
 */
export function ribbonLabelOf(info: CourseStateInfo): string | undefined {
  return info.state === "started" ? COURSE_STATE_LABEL.started : undefined;
}

/** Done or credited: the line under the title («أكملتها 18 نوفمبر» · «من سيرتك: «…»» · «من دورة: …»). */
export function questNoteOf(info: CourseStateInfo, clamp = false): ReactNode {
  if (info.state === "completed") return completedOnLine(dayMonth(info.at));
  if (info.state !== "credited") return undefined;
  if (info.by.kind === "course") return fromCourseLine(guideTitle(info.by.courseId));
  return (
    <span className={clamp ? "line-clamp-2" : undefined}>
      <span className="font-medium text-fg-3">{COURSE_COPY.fromCv} </span>
      <span className="box-decoration-clone bg-mark px-0.5 text-fg">«{info.by.evidence}»</span>
    </span>
  );
}
