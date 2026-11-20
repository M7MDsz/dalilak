"use client";

// Gallery of the signature icons (development only). Modes:
//   /dev/icons            every icon with its meaning at 48 and 24 px on paper, again on the stage, a 20 px muted row, a nav sample
//   /dev/icons?labels=0   ONLY a numbered grid at 56 px, no words (the reader test)
//   /dev/icons?zoom=1     construction view: each icon at 8x on the 24 grid, with the measured clearance of its waypoint
import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import {
  IconBase,
  IconAdvisor,
  IconApplications,
  IconBadge,
  IconCourses,
  IconCv,
  IconFieldBusiness,
  IconFieldData,
  IconFieldDesign,
  IconFieldHr,
  IconFieldMarketing,
  IconFieldProfessional,
  IconFieldSoftware,
  IconFlag,
  IconGate,
  IconGift,
  IconHereMarker,
  IconJobs,
  IconLeaderboard,
  IconLevel,
  IconMore,
  IconPath,
  IconProfile,
  IconRankDown,
  IconRankUp,
  IconSkills,
  IconStar,
  IconStarFilled,
  IconStreak,
  IconTarget,
  IconTrophy,
  IconXp,
  type IconProps,
} from "@/components/icons";

type Group = "nav" | "game" | "field";

interface Entry {
  readonly name: string;
  readonly meaning: string;
  readonly group: Group;
  readonly Icon: ComponentType<IconProps>;
}

const ICONS: readonly Entry[] = [
  { name: "IconPath", meaning: "مساري", group: "nav", Icon: IconPath },
  { name: "IconSkills", meaning: "المهارات", group: "nav", Icon: IconSkills },
  { name: "IconCourses", meaning: "الدورات", group: "nav", Icon: IconCourses },
  { name: "IconCv", meaning: "سيرتي", group: "nav", Icon: IconCv },
  { name: "IconJobs", meaning: "الوظائف", group: "nav", Icon: IconJobs },
  { name: "IconApplications", meaning: "طلباتي", group: "nav", Icon: IconApplications },
  { name: "IconLeaderboard", meaning: "المتصدرون", group: "nav", Icon: IconLeaderboard },
  { name: "IconProfile", meaning: "ملفي", group: "nav", Icon: IconProfile },
  { name: "IconAdvisor", meaning: "دليلك، المستشار", group: "nav", Icon: IconAdvisor },
  { name: "IconMore", meaning: "المزيد", group: "nav", Icon: IconMore },
  { name: "IconXp", meaning: "نقاط الخبرة XP", group: "game", Icon: IconXp },
  { name: "IconLevel", meaning: "المستوى", group: "game", Icon: IconLevel },
  { name: "IconStreak", meaning: "السلسلة اليومية", group: "game", Icon: IconStreak },
  { name: "IconBadge", meaning: "وسام", group: "game", Icon: IconBadge },
  { name: "IconTrophy", meaning: "كأس", group: "game", Icon: IconTrophy },
  { name: "IconFlag", meaning: "الهدف، علم القمة", group: "game", Icon: IconFlag },
  { name: "IconStar", meaning: "نجمة مهارة فارغة", group: "game", Icon: IconStar },
  { name: "IconStarFilled", meaning: "نجمة مهارة مكتسبة", group: "game", Icon: IconStarFilled },
  { name: "IconGift", meaning: "المكافأة اليومية", group: "game", Icon: IconGift },
  { name: "IconTarget", meaning: "الوظيفة المستهدفة", group: "game", Icon: IconTarget },
  { name: "IconRankUp", meaning: "صعدت في الترتيب", group: "game", Icon: IconRankUp },
  { name: "IconRankDown", meaning: "نزلت في الترتيب", group: "game", Icon: IconRankDown },
  { name: "IconGate", meaning: "بوابة في المسار", group: "game", Icon: IconGate },
  { name: "IconHereMarker", meaning: "أنت هنا", group: "game", Icon: IconHereMarker },
  { name: "IconFieldData", meaning: "البيانات والتحليل", group: "field", Icon: IconFieldData },
  { name: "IconFieldSoftware", meaning: "تطوير البرمجيات", group: "field", Icon: IconFieldSoftware },
  { name: "IconFieldDesign", meaning: "التصميم وتجربة المستخدم", group: "field", Icon: IconFieldDesign },
  { name: "IconFieldMarketing", meaning: "التسويق الرقمي", group: "field", Icon: IconFieldMarketing },
  { name: "IconFieldBusiness", meaning: "الأعمال والمشاريع", group: "field", Icon: IconFieldBusiness },
  { name: "IconFieldHr", meaning: "الموارد البشرية", group: "field", Icon: IconFieldHr },
  { name: "IconFieldProfessional", meaning: "المهارات المهنية", group: "field", Icon: IconFieldProfessional },
];

const GROUPS: readonly { readonly id: Group; readonly title: string; readonly note: string }[] = [
  { id: "nav", title: "التنقّل", note: "عناصر القائمة وشريط الهاتف" },
  { id: "game", title: "اللعب والمسار", note: "النقاط والمستوى والمكافآت وعلامات الخريطة" },
  { id: "field", title: "المجالات السبعة", note: "أيقونة كل مجال في شجرة المهارات والفلاتر" },
];

export default function IconsGalleryPage() {
  return (
    <Suspense fallback={null}>
      <Gallery />
    </Suspense>
  );
}

function Gallery() {
  const params = useSearchParams();
  if (params.get("labels") === "0") return <NumberedGrid />;
  if (params.get("zoom") === "1") return <Construction />;
  if (params.get("lab") === "1") return <Lab />;
  return <Overview />;
}

/* --------------------------------------------------------------------- lab */
// Candidate drawings, compared on the same grid before one goes into signature.tsx.

function labIcon(body: ReactNode): ComponentType<IconProps> {
  return function LabIcon(props: IconProps) {
    return <IconBase {...props}>{body}</IconBase>;
  };
}

const LAB: readonly Entry[] = [
  {
    name: "P1",
    meaning: "مساري",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M21 19v-4.5a9 9 0 0 0-18 0v2.25a2.25 2.25 0 0 0 4.5 0V14.5a4.5 4.5 0 0 1 9 0V19" />
        <circle className="wp" cx="12" cy="17.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "P2",
    meaning: "مساري",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M21 19v-4.5a9 9 0 0 0-18 0v2.25a2.25 2.25 0 0 0 4.5 0V14.5a4.5 4.5 0 0 1 9 0V19" />
        <circle className="wp" cx="12" cy="19" r="1.75" />
      </>,
    ),
  },
  {
    name: "S-a",
    meaning: "المهارات",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M12 21V10M12 16.5c-3.5 0-6.5-1.5-7-5 3.5 0 6.5 1.5 7 5zM12 13c3.5 0 6.5-1.5 7-5-3.5 0-6.5 1.5-7 5z" />
        <circle className="wp" cx="12" cy="5.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "S-b",
    meaning: "المهارات",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M12 21V10M12 16.5c-3.5 0-6.5-1.5-7-5 3.5 0 6.5 1.5 7 5zM12 13c3.5 0 6.5-1.5 7-5-3.5 0-6.5 1.5-7 5zM7.5 21h9" />
        <circle className="wp" cx="12" cy="5.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "S-c",
    meaning: "المهارات",
    group: "nav",
    Icon: labIcon(
      <>
        <rect height="4" rx="1.5" width="4" x="10" y="17" />
        <rect height="4" rx="1.5" width="4" x="3" y="8" />
        <rect height="4" rx="1.5" width="4" x="17" y="8" />
        <path d="M12 17v-7M12 14.5 7 12M12 14.5l5-2.5" />
        <circle className="wp" cx="12" cy="5.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "CV-A",
    meaning: "سيرتي",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M10 3h7.5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V8.5zM10 3v4a1.5 1.5 0 0 1-1.5 1.5h-4" />
        <path d="M16.5 7.5h-3M16.5 12H8M16.5 16.5h-3" />
        <circle className="wp" cx="9" cy="16.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "CV-B",
    meaning: "سيرتي",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M11.5 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9" />
        <path d="M16.5 9H9M16.5 13h-6M16.5 17h-4" />
        <circle className="wp" cx="6.5" cy="5" r="1.75" />
      </>,
    ),
  },
  {
    name: "J-A",
    meaning: "الوظائف",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M16.5 8H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.5a4.5 3.5 0 0 1 9 0M3 13.5h18" />
        <circle className="wp" cx="12" cy="9" r="1.75" />
      </>,
    ),
  },
  {
    name: "J-B",
    meaning: "الوظائف",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M16.5 8H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.5a4.5 3 0 0 1 9 0M3 14h18" />
        <circle className="wp" cx="12" cy="9.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "Ap-a",
    meaning: "طلباتي",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M8.5 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.5" />
        <path d="M9.5 3h5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M13 10.5l1.5 1.5 3-3M10 10.5H7M11 16.5H7" />
        <circle className="wp" cx="15.5" cy="16.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "L-a",
    meaning: "المتصدرون",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M3 19.5h18M7.5 19.5V9M16.5 19.5V9M3 19.5v-4A1.5 1.5 0 0 1 4.5 14h3M21 19.5V13a1.5 1.5 0 0 0-1.5-1.5h-3" />
        <circle className="wp" cx="12" cy="9.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "L-b",
    meaning: "المتصدرون",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M3 19.5h18M3 19.5v-4A1.5 1.5 0 0 1 4.5 14h3M21 19.5V13a1.5 1.5 0 0 0-1.5-1.5h-3M7.5 19.5v-10a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10" />
        <circle className="wp" cx="12" cy="12.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "L-c",
    meaning: "المتصدرون",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M3 20h18M9 20v-9a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 11v9M3 20v-4.5A1.5 1.5 0 0 1 4.5 14H9M21 20v-6.5a1.5 1.5 0 0 0-1.5-1.5H15" />
        <circle className="wp" cx="12" cy="5" r="1.75" />
      </>,
    ),
  },
  {
    name: "X-a",
    meaning: "XP",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M3 19 8 9M12 9l3 6 2.5-2 3 6" />
        <circle className="wp" cx="10" cy="5" r="1.75" />
      </>,
    ),
  },
  {
    name: "X-b",
    meaning: "XP",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M3 19 8 9M12 9l3 6 2.5-2 3 6M7.5 15.5q2.5-2.5 5 0" />
        <circle className="wp" cx="10" cy="5" r="1.75" />
      </>,
    ),
  },
  {
    name: "Lv-a",
    meaning: "المستوى",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M13.75 3.68A8.5 8.5 0 0 1 17.41 5.45M19.59 8.18A8.5 8.5 0 0 1 20.5 12.15M19.72 15.56A8.5 8.5 0 0 1 17.19 18.74M14.03 20.25A8.5 8.5 0 0 1 9.97 20.25" />
        <path d="M3.5 12.15A8.5 8.5 0 0 1 10.25 3.68" pathLength={3} strokeDasharray="0 1" />
        <circle className="wp" cx="5.36" cy="17.3" r="1.75" />
      </>,
    ),
  },
  {
    name: "Lv-b",
    meaning: "المستوى",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M13.75 3.68A8.5 8.5 0 0 1 17.41 5.45M19.59 8.18A8.5 8.5 0 0 1 20.5 12.15M19.72 15.56A8.5 8.5 0 0 1 17.19 18.74M14.03 20.25A8.5 8.5 0 0 1 9.97 20.25M9.5 14.5 12 11.5l2.5 3" />
        <path d="M3.5 12.15A8.5 8.5 0 0 1 10.25 3.68" pathLength={3} strokeDasharray="0 1" />
        <circle className="wp" cx="5.36" cy="17.3" r="1.75" />
      </>,
    ),
  },
  {
    name: "F-a",
    meaning: "الهدف",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M3 20.5Q12 13.5 21 20.5M12 17V9M12 10H5l2.5 3L5 16h7" />
        <circle className="wp" cx="12" cy="4.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "F-b",
    meaning: "الهدف",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M3 20.5Q12 13.5 21 20.5M12 17V9M12 10h7l-2.5 3 2.5 3h-7" />
        <circle className="wp" cx="12" cy="4.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "T-a",
    meaning: "كأس",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M7 4v4.5a5 5 0 0 0 10 0V4M7 6H5.5a2 2 0 0 0 0 4h2M17 6h1.5a2 2 0 0 1 0 4h-2M12 13.5v3M9.5 16.5h5M7.5 20h9" />
        <circle className="wp" cx="12" cy="5.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "T-b",
    meaning: "كأس",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M7 4v4.5a5 5 0 0 0 10 0V4M7 6H5.5a2 2 0 0 0 0 4h2M17 6h1.5a2 2 0 0 1 0 4h-2M12 13.5v3M9.5 16.5h5M7 20.5h10" />
        <circle className="wp" cx="12" cy="8" r="1.75" />
      </>,
    ),
  },
  {
    name: "G-a",
    meaning: "بوابة",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M4.5 21v-9.5a7.5 7.5 0 0 1 15 0V21M3 21h18M4.5 14h3M16.5 14h3" />
        <circle className="wp" cx="12" cy="14" r="1.75" />
      </>,
    ),
  },
  {
    name: "H-a",
    meaning: "أنت هنا",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M9 16.5 7 13A6.1 6.1 0 1 1 17 13l-2 3.5" />
        <circle className="wp" cx="12" cy="20" r="1.75" />
      </>,
    ),
  },
  {
    name: "RU",
    meaning: "صعود",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M7.5 20.5h9M12 20.5v-11M8 13.5l4-4 4 4" />
        <circle className="wp" cx="12" cy="5" r="1.75" />
      </>,
    ),
  },
  {
    name: "RD",
    meaning: "نزول",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M7.5 3.5h9M12 3.5v11M8 10.5l4 4 4-4" />
        <circle className="wp" cx="12" cy="19" r="1.75" />
      </>,
    ),
  },
  {
    name: "Adv",
    meaning: "دليلك",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M14 3.5A8.75 8.75 0 1 0 20.5 10M14.5 9.5l-1 4-4 1 1-4z" />
        <circle className="wp" cx="18" cy="6" r="1.75" />
      </>,
    ),
  },
  {
    name: "Tgt",
    meaning: "الهدف الوظيفي",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M9 20A8.5 8.5 0 1 0 4 15M12 16.5A4.5 4.5 0 1 0 7.5 12M3.5 20.5l5-5" />
        <circle className="wp" cx="12" cy="12" r="1.75" />
      </>,
    ),
  },
  {
    name: "M-a",
    meaning: "التسويق",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M16.5 5 6 9.5H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1l10.5 4.5M6 9.5v5M8 15.5V18a1.5 1.5 0 0 0 3 0v-1.5M19 9a5 5 0 0 1 0 6" />
        <circle className="wp" cx="14" cy="12" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-a",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-15M17.5 6.5h-7M15 11H9M12.5 15.5h-4" />
        <circle className="wp" cx="4" cy="15.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-b",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M3.5 3.5v15a2 2 0 0 0 2 2h15M6.5 6.5h7M9 11h6M11.5 15.5h4" />
        <circle className="wp" cx="20" cy="15.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "Pr-a",
    meaning: "المهنية",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M10 10.5V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5.5" />
        <circle cx="6.5" cy="12" r="2.5" />
        <path d="M3 21a3.5 3.5 0 0 1 7 0M9 16.5l3-4" />
        <circle className="wp" cx="15.5" cy="8.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "Pr-c",
    meaning: "المهنية",
    group: "field",
    Icon: labIcon(
      <>
        <rect height="11" rx="2" width="18" x="3" y="3" />
        <path d="M8.5 14 6 21M15.5 14l2.5 7M7 8.5h4.5" />
        <circle className="wp" cx="16" cy="8.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "Pr-b",
    meaning: "المهنية",
    group: "field",
    Icon: labIcon(
      <>
        <rect height="10" rx="1.5" width="12" x="9" y="3.5" />
        <circle cx="6.5" cy="12.5" r="2.25" />
        <path d="M3 21a3.5 3.5 0 0 1 7 0M9.5 16.5l2-4" />
        <circle className="wp" cx="15" cy="8.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "T-c",
    meaning: "كأس",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M7.5 10.5H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h2v4.5a5 5 0 0 0 10 0V4h2a2 2 0 0 1 2 2v1.5a3 3 0 0 1-3 3h-1.5M12 13.5v3M9.5 16.5h5M7.5 20h9" />
        <circle className="wp" cx="12" cy="5.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "G-b",
    meaning: "بوابة",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M3 21V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v15M3 21h4.5v-6.5a4.5 4.5 0 0 1 9 0V21H21" />
        <circle className="wp" cx="12" cy="16.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-c",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-8M18 5.5h-6M14.5 10H9M11 14.5H7" />
        <circle className="wp" cx="5" cy="19" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-d",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-15M18 5.5h-5.5M15.5 10H10M13 14.5H9.5" />
        <circle className="wp" cx="5" cy="14.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-e",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-15M18 6h-4.5M15 10.5H10M11.5 15h-2" />
        <circle className="wp" cx="5" cy="15" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-f",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-8" />
        <rect height="3" rx="1.5" width="7" x="11" y="4.5" />
        <rect height="3" rx="1.5" width="6" x="8" y="9.5" />
        <rect height="3" rx="1.5" width="4" x="8" y="14.5" />
        <circle className="wp" cx="4" cy="20" r="1.75" />
      </>,
    ),
  },
  {
    name: "B-g",
    meaning: "الأعمال",
    group: "field",
    Icon: labIcon(
      <>
        <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-8" />
        <rect height="3" rx="1.5" width="6.5" x="11.5" y="4.5" />
        <rect height="3" rx="1.5" width="6" x="7.5" y="9.5" />
        <path d="M10 16h-.5" />
        <circle className="wp" cx="5" cy="16" r="1.75" />
      </>,
    ),
  },
  {
    name: "X-c",
    meaning: "XP",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M3 19 8 9M12 9l2.5 5c.5 1 1.5 1 2 0l.5-1 3.5 6M7.5 15.5q2.5-2.5 5 0" />
        <circle className="wp" cx="10" cy="5" r="1.75" />
      </>,
    ),
  },
  {
    name: "J-C",
    meaning: "الوظائف",
    group: "nav",
    Icon: labIcon(
      <>
        <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h4M3 16h18" />
        <circle className="wp" cx="12" cy="11.5" r="1.75" />
      </>,
    ),
  },
  {
    name: "H-old",
    meaning: "أنت هنا",
    group: "game",
    Icon: labIcon(
      <>
        <path d="M9 16.5 7 13A6.1 6.1 0 1 1 17 13l-2 3.5" />
        <circle cx="12" cy="9.5" r="2" />
        <circle className="wp" cx="12" cy="20" r="1.75" />
      </>,
    ),
  },
];

// Every candidate small, as it will really be seen: 24 on paper, 20 muted, 18 in a chip.
function LabStrip() {
  return (
    <div className="mt-6 flex w-[620px] flex-wrap gap-x-5 gap-y-4 rounded-2xl border border-line bg-sheet px-6 py-5" id="lab-strip">
      {LAB.map((e) => (
        <div className="flex flex-col items-center gap-1.5" key={e.name}>
          <div className="flex items-end gap-2 text-ink">
            <e.Icon size={24} />
            <span className="text-ink-2">
              <e.Icon size={20} waypoint="muted" />
            </span>
            <span className="text-ink-2">
              <e.Icon size={18} waypoint="muted" />
            </span>
          </div>
          <span className="text-[11px] text-ink-3" dir="ltr">
            {e.name}
          </span>
        </div>
      ))}
      <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-[16px] font-semibold text-xp-ink">
        {LAB.filter((e) => e.name.startsWith("X-")).map((e) => (
          <span className="flex items-center gap-1.5" key={e.name}>
            <e.Icon size={16} /> <span dir="ltr">+200 XP</span>
            <e.Icon size={18} waypoint="muted" /> <span dir="ltr">1,240 XP</span>
            <span className="text-[11px] font-normal text-ink-3">{e.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Lab() {
  return (
    <main className="mx-auto max-w-[1440px] px-8 py-8">
      <h1 className="text-[22px] font-bold text-ink">مختبر المسودات</h1>
      <p className="mt-1 text-[14px] text-ink-2" dir="ltr">
        Second-pass drafts, kept as the record of what was compared. Chosen and now in signature.tsx: P1, S-b, CV-A, J-B, Ap-a, L-b,
        X-b, Lv-a, F-b, T-c, G-b, H-old, RU, RD, Adv, Tgt, M-a, B-c, Pr-c. H-a shows why the pin keeps its ring (without it, a light bulb).
      </p>
      <LabStrip />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {LAB.map((e, i) => (
          <BuildCell entry={e} index={i + 1} key={e.name} />
        ))}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- overview */

function Overview() {
  return (
    <main className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-line pb-6">
        <div>
          <h1 className="text-[24px] font-bold leading-tight text-ink lg:text-[28px]">أيقونات دليل: التوقيع</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            31 أيقونة مرسومة باليد على شبكة 24. خط واحد بسماكة 2، زوايا مستديرة، وكل خط يبقى مفتوحاً وتجلس في فتحته نقطة طريق واحدة.
          </p>
        </div>
        <nav className="flex gap-4 text-[13px] text-ink-3" dir="ltr">
          <a className="underline" href="/dev/icons?zoom=1">
            construction
          </a>
          <a className="underline" href="/dev/icons?labels=0">
            numbered
          </a>
        </nav>
      </header>

      {GROUPS.map((g) => (
        <section className="mt-10" id={`group-${g.id}`} key={g.id}>
          <div className="flex items-baseline gap-3">
            <h2 className="text-[18px] font-bold text-ink">{g.title}</h2>
            <span className="text-[14px] text-ink-3">{g.note}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ICONS.filter((e) => e.group === g.id).map((e) => (
              <Card entry={e} key={e.name} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12 overflow-hidden rounded-2xl p-5 lg:p-8" data-surface="stage" id="stage">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[18px] font-bold text-fg">على المسرح</h2>
          <span className="text-[14px] text-fg-2">الأيقونات نفسها على السطح الداكن، 48 و24</span>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
          {ICONS.map((e) => (
            <div className="flex flex-col items-center gap-3" key={e.name}>
              <div className="flex items-end gap-4 text-on-stage">
                <e.Icon size={48} />
                <e.Icon size={24} />
              </div>
              <span className="text-center text-[13px] leading-snug text-on-stage-2">{e.meaning}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" id="muted">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[18px] font-bold text-ink">20 بكسل، النقطة خافتة</h2>
          <span className="text-[14px] text-ink-3">كما في عناصر القائمة غير النشطة</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-4 rounded-2xl border border-line bg-sheet px-6 py-5 text-ink-3">
          {ICONS.map((e) => (
            <e.Icon key={e.name} size={20} title={e.meaning} waypoint="muted" />
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[300px_1fr]" id="samples">
        <NavSample />
        <InlineSample />
      </section>
    </main>
  );
}

function Card({ entry }: { readonly entry: Entry }) {
  const { Icon } = entry;
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-sheet px-3 pb-4 pt-6">
      <div className="flex items-end gap-5 text-ink">
        <Icon size={48} />
        <Icon size={24} />
      </div>
      <div className="text-center">
        <div className="text-[15px] font-semibold leading-snug text-ink">{entry.meaning}</div>
        <div className="mt-1 text-[12px] text-ink-3" dir="ltr">
          {entry.name}
        </div>
      </div>
    </div>
  );
}

// The navigation as the shell will draw it: the active item keeps its waypoint, the others are muted.
function NavSample() {
  const items = ICONS.filter((e) => e.group === "nav" && e.name !== "IconMore" && e.name !== "IconAdvisor");
  return (
    <div className="rounded-2xl border border-line bg-sheet p-3">
      {items.map((e, i) => (
        <div
          className={
            i === 0
              ? "flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2.5 text-ink"
              : "flex items-center gap-3 px-3 py-2.5 text-ink-2"
          }
          key={e.name}
        >
          <e.Icon size={22} waypoint={i === 0 ? "on" : "muted"} />
          <span className="text-[16px] font-medium">{e.meaning}</span>
        </div>
      ))}
    </div>
  );
}

// Small sizes next to numbers and words, where XP, stars and rank arrows really live.
function InlineSample() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-sheet p-6 text-ink">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[16px]">
        <span className="flex items-center gap-1.5 font-semibold text-xp-ink">
          <IconXp size={16} /> <span dir="ltr">+200 XP</span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-xp-ink">
          <IconXp size={18} /> <span dir="ltr">1,240 XP</span>
        </span>
        <span className="flex items-center gap-1 text-xp-line">
          <IconStarFilled size={16} waypoint="off" />
          <IconStarFilled size={16} waypoint="off" />
          <IconStar size={16} waypoint="off" />
        </span>
        <span className="flex items-center gap-1 text-xp-line">
          <IconStarFilled size={20} />
          <IconStar size={20} />
        </span>
        <span className="flex items-center gap-1 font-semibold text-ok">
          <IconRankUp size={16} /> <span dir="ltr">8</span>
        </span>
        <span className="flex items-center gap-1 font-semibold text-warn">
          <IconRankDown size={16} /> <span dir="ltr">2</span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold">
          <IconStreak size={20} /> <span dir="ltr">4</span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold">
          <IconLevel size={20} /> المستوى 4
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-ink-2">
          <IconTrophy size={20} /> <IconBadge size={20} /> <IconLeaderboard size={20} waypoint="muted" />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[15px]">
        {ICONS.filter((e) => e.group === "field").map((e) => (
          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-ink-2" key={e.name}>
            <e.Icon size={18} waypoint="muted" />
            {e.meaning}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-[15px] text-ink-2">
        <span className="flex items-center gap-2">
          <IconHereMarker size={20} /> أنت هنا
        </span>
        <span className="flex items-center gap-2">
          <IconGate size={20} /> بانتظار سيرتك
        </span>
        <span className="flex items-center gap-2">
          <IconFlag size={20} /> القمة: محلل بيانات
        </span>
        <span className="flex items-center gap-2">
          <IconTarget size={20} /> وظيفتك المستهدفة
        </span>
        <span className="flex items-center gap-2">
          <IconGift size={20} /> مكافأة اليوم
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ numbered grid */

function NumberedGrid() {
  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8 lg:px-10 lg:py-10">
      <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
        {ICONS.map((e, i) => (
          <div className="relative flex h-[132px] items-center justify-center rounded-xl border border-line bg-sheet text-ink" key={e.name}>
            <span className="absolute start-3 top-2 text-[15px] font-semibold text-ink-3" dir="ltr">
              {i + 1}
            </span>
            <e.Icon size={56} />
          </div>
        ))}
      </div>
    </main>
  );
}

/* --------------------------------------------------------- construction view */

interface Measure {
  readonly dots: number;
  readonly air: number | null; // free space between the dot's edge and the nearest stroke edge, in grid units
  readonly box: readonly [number, number, number, number]; // centreline extent: minX, minY, maxX, maxY
  readonly length: number; // total stroke length, a rough measure of visual weight
  readonly offGrid: readonly number[];
  readonly filled: boolean;
}

const HALF_STROKE = 1;
const DOT_R = 1.75;

function measure(svg: SVGSVGElement): Measure {
  const wps = Array.from(svg.querySelectorAll<SVGCircleElement>("circle.wp"));
  const parts = Array.from(svg.querySelectorAll<SVGGeometryElement>("path, circle, rect, line, polyline, polygon, ellipse")).filter(
    (el) => !el.classList.contains("wp"),
  );
  const dot = wps[0];
  const cx = dot ? dot.cx.baseVal.value : 0;
  const cy = dot ? dot.cy.baseVal.value : 0;
  let minD = Number.POSITIVE_INFINITY;
  let x0 = 99;
  let y0 = 99;
  let x1 = -99;
  let y1 = -99;
  let length = 0;
  let filled = false;
  const offGrid = new Set<number>();
  for (const el of parts) {
    const fill = el.getAttribute("fill");
    if (fill !== null && fill !== "none") filled = true;
    const len = el.getTotalLength();
    length += len;
    const n = Math.max(40, Math.ceil(len * 24));
    for (let i = 0; i <= n; i++) {
      const p = el.getPointAtLength((len * i) / n);
      minD = Math.min(minD, Math.hypot(p.x - cx, p.y - cy));
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    const attrs = el.tagName === "path" ? [el.getAttribute("d") ?? ""] : ["cx", "cy", "x", "y", "width", "height", "x1", "y1", "x2", "y2"].map((a) => el.getAttribute(a) ?? "");
    for (const a of attrs) {
      for (const m of a.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []) {
        const v = Number(m);
        if (Math.abs(v * 2 - Math.round(v * 2)) > 1e-6) offGrid.add(v);
      }
    }
  }
  return {
    dots: wps.length,
    air: dot ? minD - DOT_R - HALF_STROKE : null,
    box: [x0, y0, x1, y1],
    length,
    offGrid: Array.from(offGrid),
    filled,
  };
}

function Construction() {
  return (
    <main className="mx-auto max-w-[1440px] px-8 py-8">
      <h1 className="text-[22px] font-bold text-ink">البناء على الشبكة</h1>
      <p className="mt-1 text-[14px] text-ink-2" dir="ltr">
        8x on the 24 grid · dashed square = 2 px margin · air = free space between the dot and the nearest stroke (rule: 1.5 or more) · box = stroke centreline extent (rule: 3 to 21)
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {ICONS.map((e, i) => (
          <BuildCell entry={e} index={i + 1} key={e.name} />
        ))}
      </div>
    </main>
  );
}

function BuildCell({ entry, index }: { readonly entry: Entry; readonly index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Measure | null>(null);
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (svg) setM(measure(svg));
  }, []);
  const { Icon } = entry;
  const fmt = (v: number) => (Math.round(v * 100) / 100).toString();
  const airOk = m !== null && (m.filled || (m.air !== null && m.air >= 1.45));
  const boxOk = m !== null && m.box[0] >= 2.99 && m.box[1] >= 2.99 && m.box[2] <= 21.01 && m.box[3] <= 21.01;
  return (
    <div className="rounded-xl border border-line bg-sheet p-3" id={`cell-${entry.name}`}>
      <div className="relative mx-auto h-[192px] w-[192px]">
        <svg aria-hidden className="absolute inset-0" height={192} viewBox="0 0 24 24" width={192}>
          {Array.from({ length: 25 }, (_, k) => (
            <g key={k}>
              <line stroke="var(--color-contour)" strokeWidth={k % 6 === 0 ? 0.06 : 0.03} x1={k} x2={k} y1={0} y2={24} />
              <line stroke="var(--color-contour)" strokeWidth={k % 6 === 0 ? 0.06 : 0.03} x1={0} x2={24} y1={k} y2={k} />
            </g>
          ))}
          <rect fill="none" height={20} stroke="var(--color-contour-ink)" strokeDasharray="0.3 0.3" strokeWidth={0.05} width={20} x={2} y={2} />
        </svg>
        <div className="absolute inset-0 text-ink" ref={ref}>
          <Icon size={192} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-end gap-2 text-ink">
          <Icon size={24} />
          <Icon size={20} waypoint="muted" />
        </div>
        <span className="text-[13px] font-semibold text-ink-3" dir="ltr">
          {index}
        </span>
      </div>
      <div className="mt-1 text-[14px] font-semibold text-ink">{entry.meaning}</div>
      <div className="text-[12px] leading-relaxed text-ink-3" dir="ltr">
        {entry.name}
        {m && (
          <>
            <br />
            <span className={airOk ? "text-ok" : "font-bold text-warn"}>
              air {m.filled ? "fill" : m.air === null ? "no dot" : fmt(m.air)}
            </span>
            {" · "}
            <span className={m.dots === 1 ? "" : "font-bold text-warn"}>dots {m.dots}</span>
            {" · "}
            <span className={boxOk ? "" : "font-bold text-warn"}>box {m.box.map(fmt).join(" ")}</span>
            <br />
            len {Math.round(m.length)}
            {m.offGrid.length > 0 && <span className="text-warn"> · off {m.offGrid.map(fmt).join(" ")}</span>}
          </>
        )}
      </div>
    </div>
  );
}

