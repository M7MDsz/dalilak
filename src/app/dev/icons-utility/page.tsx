"use client";

// Gallery of the utility icons (development only). Owned by the utility-icons agent. Modes:
//   /dev/icons-utility            every icon with its meaning at 48 and 24 px on paper (grouped by where the waypoint sits),
//                                 the same on the stage, a 20 px row with the waypoint muted, and the icons in use
//   /dev/icons-utility?labels=0   ONLY a numbered grid at 56 px, no words (the reader test; order = numbered.json, shuffled
//                                 on purpose so that neighbours do not give each other away)
//   /dev/icons-utility?zoom=1     construction view: each icon at 8x on the 24 grid, with the measured air around its waypoint
import { Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";

import {
  IconArrowBack,
  IconArrowDown,
  IconArrowForward,
  IconArrowUp,
  IconBranch,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconChevronBack,
  IconChevronDown,
  IconChevronForward,
  IconChevronUp,
  IconClock,
  IconClose,
  IconCompany,
  IconCopy,
  IconEdit,
  IconEvidence,
  IconExperience,
  IconFile,
  IconFilter,
  IconInfo,
  IconLessons,
  IconListView,
  IconLocation,
  IconLock,
  IconLogout,
  IconMapView,
  IconNewChat,
  IconPaste,
  IconPlay,
  IconPlus,
  IconRemote,
  IconReset,
  IconRetry,
  IconSearch,
  IconSend,
  IconStop,
  IconTrash,
  IconUnlock,
  IconUpload,
  IconWarning,
  type IconProps,
} from "@/components/icons";

type Rule = "move" | "open" | "place";

interface Entry {
  readonly name: string;
  readonly meaning: string;
  readonly rule: Rule;
  readonly Icon: ComponentType<IconProps>;
}

// The 42, in the order of the design brief (section 6).
const ICONS: readonly Entry[] = [
  { name: "IconSearch", meaning: "بحث", rule: "open", Icon: IconSearch },
  { name: "IconFilter", meaning: "تصفية", rule: "open", Icon: IconFilter },
  { name: "IconUpload", meaning: "رفع ملف", rule: "move", Icon: IconUpload },
  { name: "IconSend", meaning: "تقديم", rule: "move", Icon: IconSend },
  { name: "IconArrowForward", meaning: "التالي (سهم للأمام)", rule: "move", Icon: IconArrowForward },
  { name: "IconArrowBack", meaning: "رجوع", rule: "move", Icon: IconArrowBack },
  { name: "IconArrowUp", meaning: "إلى الأعلى", rule: "move", Icon: IconArrowUp },
  { name: "IconArrowDown", meaning: "إلى الأسفل", rule: "move", Icon: IconArrowDown },
  { name: "IconChevronDown", meaning: "فتح القائمة", rule: "move", Icon: IconChevronDown },
  { name: "IconChevronUp", meaning: "طيّ", rule: "move", Icon: IconChevronUp },
  { name: "IconChevronForward", meaning: "التالي", rule: "move", Icon: IconChevronForward },
  { name: "IconChevronBack", meaning: "السابق", rule: "move", Icon: IconChevronBack },
  { name: "IconPlus", meaning: "إضافة", rule: "move", Icon: IconPlus },
  { name: "IconClose", meaning: "إغلاق", rule: "move", Icon: IconClose },
  { name: "IconCheck", meaning: "صحيح", rule: "move", Icon: IconCheck },
  { name: "IconCheckCircle", meaning: "تمّ", rule: "open", Icon: IconCheckCircle },
  { name: "IconLock", meaning: "مقفلة", rule: "open", Icon: IconLock },
  { name: "IconUnlock", meaning: "مفتوحة", rule: "open", Icon: IconUnlock },
  { name: "IconEdit", meaning: "تعديل", rule: "move", Icon: IconEdit },
  { name: "IconTrash", meaning: "حذف", rule: "open", Icon: IconTrash },
  { name: "IconRetry", meaning: "حاول مجدداً", rule: "move", Icon: IconRetry },
  { name: "IconStop", meaning: "إيقاف الإجابة", rule: "place", Icon: IconStop },
  { name: "IconPlay", meaning: "ابدأ الدرس", rule: "move", Icon: IconPlay },
  { name: "IconLogout", meaning: "خروج", rule: "move", Icon: IconLogout },
  { name: "IconInfo", meaning: "معلومة", rule: "move", Icon: IconInfo },
  { name: "IconWarning", meaning: "تنبيه", rule: "open", Icon: IconWarning },
  { name: "IconCopy", meaning: "نسخ", rule: "open", Icon: IconCopy },
  { name: "IconClock", meaning: "الساعات", rule: "open", Icon: IconClock },
  { name: "IconLocation", meaning: "المدينة", rule: "place", Icon: IconLocation },
  { name: "IconCompany", meaning: "الجهة", rule: "open", Icon: IconCompany },
  { name: "IconCalendar", meaning: "التاريخ", rule: "place", Icon: IconCalendar },
  { name: "IconFile", meaning: "ملف", rule: "open", Icon: IconFile },
  { name: "IconPaste", meaning: "نص ملصق", rule: "place", Icon: IconPaste },
  { name: "IconEvidence", meaning: "من سيرتك: الجملة التي تثبت المهارة", rule: "open", Icon: IconEvidence },
  { name: "IconBranch", meaning: "تفرّع إلى وظيفة أخرى", rule: "move", Icon: IconBranch },
  { name: "IconMapView", meaning: "عرض الخريطة", rule: "place", Icon: IconMapView },
  { name: "IconListView", meaning: "عرض القائمة", rule: "place", Icon: IconListView },
  { name: "IconNewChat", meaning: "محادثة جديدة", rule: "open", Icon: IconNewChat },
  { name: "IconReset", meaning: "ابدأ العرض من جديد", rule: "move", Icon: IconReset },
  { name: "IconRemote", meaning: "عن بُعد", rule: "open", Icon: IconRemote },
  { name: "IconLessons", meaning: "الدروس", rule: "place", Icon: IconLessons },
  { name: "IconExperience", meaning: "سنوات الخبرة", rule: "move", Icon: IconExperience },
];

// Reader-test order (artifacts/foundation/icons-utility/numbered.json lists the same order with the meanings).
const NUMBERED: readonly string[] = [
  "IconLock", "IconSend", "IconChevronDown", "IconCalendar", "IconRetry", "IconEvidence", "IconArrowForward",
  "IconCompany", "IconPlus", "IconClock", "IconMapView", "IconTrash", "IconChevronForward", "IconInfo",
  "IconBranch", "IconUpload", "IconRemote", "IconClose", "IconListView", "IconArrowUp", "IconFile",
  "IconPlay", "IconSearch", "IconExperience", "IconCheckCircle", "IconLogout", "IconChevronBack", "IconPaste",
  "IconStop", "IconLocation", "IconArrowBack", "IconNewChat", "IconWarning", "IconUnlock", "IconLessons",
  "IconCheck", "IconFilter", "IconArrowDown", "IconCopy", "IconReset", "IconChevronUp", "IconEdit",
];

const RULES: readonly { readonly id: Rule; readonly title: string; readonly note: string }[] = [
  {
    id: "move",
    title: "الحركة",
    note: "النقطة على مسار الخط: بعد رأس السهم، على امتداد الذراع الأمامية، حيث تلمس علامة الصح الأرض، فوق الدرجة الأخيرة",
  },
  { id: "open", title: "الأشياء", note: "الخط ينفتح مرة واحدة، والنقطة في الفتحة: الحلقة والصفحة والباب وذيل الفقاعة" },
  { id: "place", title: "المواضع", note: "النقطة موضعك: المكان على الخريطة، اليوم في التقويم، السطر الحالي، مؤشر الكتابة" },
];

// Icons whose dot sits outside their strokes: with waypoint="off" the strokes re-centre themselves (shown in #off).
const OFF_SET: readonly string[] = [
  "IconArrowForward", "IconArrowBack", "IconArrowUp", "IconArrowDown", "IconChevronDown", "IconChevronUp",
  "IconChevronForward", "IconChevronBack", "IconPlus", "IconClose", "IconCheck", "IconSend", "IconUpload", "IconFilter",
  "IconLogout", "IconEdit", "IconPlay", "IconBranch", "IconEvidence", "IconNewChat", "IconExperience",
];

export default function UtilityIconsGalleryPage() {
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
  return <Overview />;
}

/* ---------------------------------------------------------------- overview */

function Overview() {
  return (
    <main className="mx-auto max-w-[1360px] px-4 py-8 md:px-10 md:py-12">
      <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink">أيقونات دليلك: الواجهة</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            42 أيقونة صغيرة للأسهم والأزرار والأشياء، من عائلة أيقونات التوقيع نفسها: شبكة 24، خط بسماكة 2، ونقطة طريق واحدة توضع بقاعدة واحدة من ثلاث.
          </p>
        </div>
        <nav className="flex gap-4 text-[13px] text-ink-3" dir="ltr">
          <a className="underline" href="/dev/icons-utility?zoom=1">
            construction
          </a>
          <a className="underline" href="/dev/icons-utility?labels=0">
            numbered
          </a>
          <a className="underline" href="/dev/icons">
            signature
          </a>
        </nav>
      </header>

      {RULES.map((g) => (
        <section className="mt-10" id={`rule-${g.id}`} key={g.id}>
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
            <h2 className="text-[18px] font-bold text-ink">{g.title}</h2>
            <span className="text-[14px] text-ink-3">{g.note}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {ICONS.filter((e) => e.rule === g.id).map((e) => (
              <Card entry={e} key={e.name} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12 overflow-hidden rounded-2xl p-5 md:p-8" data-surface="stage" id="stage">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h2 className="text-[18px] font-bold text-fg">على المسرح</h2>
          <span className="text-[14px] text-fg-2">الأيقونات نفسها على السطح الداكن، 48 و24</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
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
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h2 className="text-[18px] font-bold text-ink">20 بكسل، النقطة خافتة</h2>
          <span className="text-[14px] text-ink-3">كما في عنصر غير نشط</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-4 rounded-2xl border border-line bg-sheet px-6 py-5 text-ink-2">
          {ICONS.map((e) => (
            <e.Icon key={e.name} size={20} title={e.meaning} waypoint="muted" />
          ))}
        </div>
      </section>

      <section className="mt-12" id="off">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h2 className="text-[18px] font-bold text-ink">النقطة مطفأة</h2>
          <span className="text-[14px] text-ink-3">حين تُطفأ النقطة تعود الخطوط إلى منتصف المربع، كما في القوائم المنسدلة وخانات الاختيار</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-line bg-sheet px-4 py-5 md:px-6">
          {OFF_SET.map((name) => {
            const e = ICONS.find((x) => x.name === name);
            if (!e) return null;
            return (
              <div className="flex flex-col items-center gap-2" key={name}>
                <div className="relative flex size-14 items-center justify-center rounded-lg border border-line text-ink">
                  <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line" />
                  <span aria-hidden className="absolute inset-y-0 start-1/2 w-px bg-line" />
                  <e.Icon className="relative" size={40} waypoint="off" />
                </div>
                <div className="relative flex size-8 items-center justify-center rounded-md border border-line text-ink">
                  <e.Icon size={20} waypoint="off" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12" id="in-use">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h2 className="text-[18px] font-bold text-ink">في الاستعمال</h2>
          <span className="text-[14px] text-ink-3">بجانب الكلمات والأرقام، بالأحجام الحقيقية</span>
        </div>
        <InUse />
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

// The icons where they will live: meta lines, toggles, controls. Drawn with plain tokens, not the kit, so this page does not
// depend on another agent's work in progress. It follows the waypoint rule of globals.css: quiet controls (chips, icon
// buttons, secondary buttons, meta lines) carry `wp-quiet` or waypoint="muted", so their dot takes the icon's colour; the
// coral stays only on the next action (upload the CV, send, apply) and on your place (the current map/list toggle).
function InUse() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-sheet p-4 text-ink md:p-6">
        <div className="text-[16px] font-semibold">محلل بيانات</div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <IconCompany size={18} waypoint="muted" /> وادي الغيم للبيانات
          </span>
          <span className="flex items-center gap-1.5">
            <IconLocation size={18} waypoint="muted" /> الرياض
          </span>
          <span className="flex items-center gap-1.5">
            <IconRemote size={18} waypoint="muted" /> عن بُعد
          </span>
          <span className="flex items-center gap-1.5">
            <IconExperience size={18} waypoint="muted" /> حتى سنة خبرة
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <IconClock size={18} waypoint="muted" /> <span dir="ltr">6</span> ساعات
          </span>
          <span className="flex items-center gap-1.5">
            <IconLessons size={18} waypoint="muted" /> <span dir="ltr">5</span> دروس
          </span>
          <span className="flex items-center gap-1.5">
            <IconCalendar size={18} waypoint="muted" /> اليوم
          </span>
          <span className="flex items-center gap-1.5 text-ok">
            <IconCheckCircle size={18} waypoint="muted" /> تمّ
          </span>
          <span className="flex items-center gap-1.5">
            <IconLock size={18} waypoint="muted" /> مقفلة
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2.5 text-[15px] text-ink-2">
          <IconEvidence className="mt-0.5 text-ink-3" size={20} waypoint="muted" />
          <span>
            من سيرتك: «تنظيف بيانات المبيعات الأسبوعية وتلخيصها في <bdi>Excel</bdi>»
          </span>
        </div>
        <div className="wp-quiet flex flex-wrap items-center gap-3 text-[15px] text-ink-2">
          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <IconBranch size={18} /> بعدها تطابق محلل أعمال
          </span>
          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <IconWarning className="text-warn" size={18} /> الملف كبير
          </span>
          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <IconInfo size={18} /> بيانات تجريبية
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-sheet p-4 text-ink md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[16px] font-semibold text-on-accent">
            ابدأ الآن <IconArrowForward size={20} waypoint="muted" />
          </span>
          <span className="wp-quiet flex h-11 items-center gap-2 rounded-xl border border-ink px-5 text-[16px] font-semibold">
            <IconArrowBack size={20} /> رجوع لمساري
          </span>
          <span className="wp-quiet flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-[16px]">
            <IconSearch size={20} /> ابحث عن وظيفة
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 items-center gap-2 rounded-xl border border-line-strong ps-3 pe-3 text-[16px]">
            <IconFilter size={20} waypoint="muted" /> المجال <IconChevronDown className="ms-6 text-ink-3" size={20} waypoint="off" />
          </span>
          <span className="flex h-11 items-center gap-1 rounded-full border border-line bg-paper p-1 text-[15px]">
            <span className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-on-stage">
              <IconMapView size={18} /> خريطة
            </span>
            <span className="flex h-9 items-center gap-1.5 px-3 text-ink-2">
              <IconListView size={18} waypoint="muted" /> قائمة
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span aria-label="إرسال" className="flex size-11 items-center justify-center rounded-full bg-ink text-on-stage">
            <IconArrowUp size={22} />
          </span>
          <span aria-label="إيقاف" className="wp-quiet flex size-11 items-center justify-center rounded-full bg-ink text-on-stage">
            <IconStop size={22} />
          </span>
          <span aria-label="إغلاق" className="wp-quiet flex size-11 items-center justify-center rounded-full border border-line">
            <IconClose size={20} />
          </span>
          <span aria-label="محادثة جديدة" className="wp-quiet flex size-11 items-center justify-center rounded-full border border-line">
            <IconNewChat size={20} />
          </span>
          <span aria-label="نسخ" className="wp-quiet flex size-11 items-center justify-center rounded-full border border-line">
            <IconCopy size={20} />
          </span>
          <span aria-label="حاول مجدداً" className="wp-quiet flex size-11 items-center justify-center rounded-full border border-line">
            <IconRetry size={20} />
          </span>
          <span className="flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-[15px]">
            <IconSend size={20} /> قدّم لي
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[15px] text-ink-2">
          <span className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2">
            <IconUpload size={20} /> ارفع سيرتك
          </span>
          <span className="wp-quiet flex items-center gap-2 rounded-lg border border-line px-3 py-2">
            <IconFile size={20} /> <bdi>cv-sara.pdf</bdi>
          </span>
          <span className="wp-quiet flex items-center gap-2 rounded-lg border border-line px-3 py-2">
            <IconPaste size={20} /> الصق النص
          </span>
          <span className="flex items-center gap-2 px-1 py-2">
            <IconCheck className="text-ok" size={18} waypoint="off" /> تمّ الرفع
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ numbered grid */

function NumberedGrid() {
  const byName = new Map(ICONS.map((e) => [e.name, e] as const));
  const entries = NUMBERED.map((n) => byName.get(n)).filter((e): e is Entry => e !== undefined);
  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-10 md:py-10">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {entries.map((e, i) => (
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
  readonly box: readonly [number, number, number, number]; // centreline extent of the strokes: minX, minY, maxX, maxY
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
  let filled = false;
  for (const el of parts) {
    const fill = el.getAttribute("fill");
    if (fill !== null && fill !== "none") filled = true;
    const len = el.getTotalLength();
    const n = Math.max(40, Math.ceil(len * 24));
    const take = (x: number, y: number) => {
      minD = Math.min(minD, Math.hypot(x - cx, y - cy));
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    };
    for (let i = 0; i <= n; i++) {
      const p = el.getPointAtLength((len * i) / n);
      take(p.x, p.y);
    }
    // Zero-length subpaths ("M12 11h0") are the round dots of a dotted trail: sample them by their start point.
    for (const z of (el.getAttribute("d") ?? "").matchAll(/M\s*([\d.]+)[\s,]+([\d.]+)h0/g)) take(Number(z[1]), Number(z[2]));
  }
  return { dots: wps.length, air: dot ? minD - DOT_R - HALF_STROKE : null, box: [x0, y0, x1, y1], filled };
}

/** Ink box of everything drawn (strokes with their half width, plus the dot), and its centre: where the eye puts the icon. */
function inkBox(m: Measure, dot: readonly [number, number] | null): readonly [number, number, number, number] {
  const [x0, y0, x1, y1] = m.box;
  if (!dot) return [x0 - HALF_STROKE, y0 - HALF_STROKE, x1 + HALF_STROKE, y1 + HALF_STROKE];
  return [
    Math.min(x0 - HALF_STROKE, dot[0] - DOT_R),
    Math.min(y0 - HALF_STROKE, dot[1] - DOT_R),
    Math.max(x1 + HALF_STROKE, dot[0] + DOT_R),
    Math.max(y1 + HALF_STROKE, dot[1] + DOT_R),
  ];
}

function Construction() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
      <h1 className="text-[22px] font-bold text-ink">البناء على الشبكة</h1>
      <p className="mt-1 text-[14px] text-ink-2" dir="ltr">
        8x on the 24 grid · dashed square = 2 px margin · air = free space between the waypoint and the nearest stroke (rule: 1.5 or
        more) · box = stroke centreline extent (rule: 3 to 21) · dot = the waypoint centre · ink = everything drawn, dot included
        (rule: 2 to 22), c = its centre · off c = centre of the strokes with waypoint=&quot;off&quot; (rule: within 1 of 12)
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {ICONS.map((e, i) => (
          <BuildCell entry={e} index={i + 1} key={e.name} />
        ))}
      </div>
    </main>
  );
}

function BuildCell({ entry, index }: { readonly entry: Entry; readonly index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const offRef = useRef<HTMLSpanElement>(null);
  const [m, setM] = useState<Measure | null>(null);
  const [dot, setDot] = useState<readonly [number, number] | null>(null);
  const [offC, setOffC] = useState<readonly [number, number] | null>(null);
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    setM(measure(svg));
    const wp = svg.querySelector<SVGCircleElement>("circle.wp");
    if (wp) setDot([wp.cx.baseVal.value, wp.cy.baseVal.value]);
    // With the dot off (display none, so outside the box), the strokes' own centre, transforms included.
    const off = offRef.current?.querySelector("svg");
    if (off) {
      const b = off.getBBox();
      setOffC([b.x + b.width / 2, b.y + b.height / 2]);
    }
  }, []);
  const { Icon } = entry;
  const fmt = (v: number) => (Math.round(v * 100) / 100).toString();
  const airOk = m !== null && (m.filled || (m.air !== null && m.air >= 1.45));
  const boxOk = m !== null && m.box[0] >= 2.99 && m.box[1] >= 2.99 && m.box[2] <= 21.01 && m.box[3] <= 21.01;
  const ink = m ? inkBox(m, dot) : null;
  const inkOk = ink !== null && ink[0] >= 1.99 && ink[1] >= 1.99 && ink[2] <= 22.01 && ink[3] <= 22.01;
  const offOk = offC !== null && Math.abs(offC[0] - 12) <= 1 && Math.abs(offC[1] - 12) <= 1;
  return (
    <div className="rounded-xl border border-line bg-sheet p-3">
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
          <span className="flex" ref={offRef}>
            <Icon size={20} waypoint="off" />
          </span>
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
            dot {dot ? dot.map(fmt).join(" ") : "none"}
            {ink && (
              <>
                {" · "}
                <span className={inkOk ? "" : "font-bold text-warn"}>ink {ink.map(fmt).join(" ")}</span>
                {" · "}c {fmt((ink[0] + ink[2]) / 2)} {fmt((ink[1] + ink[3]) / 2)}
              </>
            )}
            <br />
            <span className={offOk ? "" : "font-bold text-warn"}>off c {offC ? offC.map(fmt).join(" ") : "?"}</span>
          </>
        )}
      </div>
    </div>
  );
}
