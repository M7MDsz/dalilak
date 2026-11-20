"use client";
// Owner: shell. The icon of each navigation item (spec 2.5; DESIGN-BRIEF 6: «مساري» uses a cut of the logo mark).
import type { ComponentType } from "react";

import {
  IconApplications,
  IconCourses,
  IconCv,
  IconJobs,
  IconLeaderboard,
  IconPath,
  IconProfile,
  IconSkills,
  type IconProps,
} from "@/components/icons";

import type { NavItemId } from "./nav";

export const NAV_ICON = {
  path: IconPath,
  skills: IconSkills,
  learn: IconCourses,
  cv: IconCv,
  jobs: IconJobs,
  applications: IconApplications,
  leaderboard: IconLeaderboard,
  profile: IconProfile,
} as const satisfies Record<NavItemId, ComponentType<IconProps>>;
