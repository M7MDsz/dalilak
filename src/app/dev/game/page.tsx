"use client";
// /dev/game: the game layer gallery (docs/GAME-LAYER.md). Every game piece in every state, on paper and on the stage, with
// the spec's demo content (خالد, محلل بيانات 70%, أساسيات Power BI +200 XP), live demos of the moving pieces, and two mocks
// of redesigned screens built only from these pieces (the jobs page and the CV results). Owned by the game-layer lead.
import { useState, type ReactNode } from "react";

import {
  IconCv,
  IconFieldBusiness,
  IconFieldData,
  IconFieldProfessional,
  IconFieldSoftware,
  IconFilter,
  IconLocation,
  IconSearch,
  IconArrowForward,
  IconStar,
  IconAdvisor,
  IconXp,
  IconStreak,
  IconLeaderboard,
} from "@/components/icons";
import {
  AnswerTile,
  CollectionMeter,
  DailyTrack,
  dailyDays,
  DestinationCard,
  LessonMeter,
  LevelToken,
  LockedGem,
  LootCard,
  LootReveal,
  PlayerCard,
  PlayerChip,
  QuestCard,
  RewardChip,
  RewardRow,
  SkillGem,
  StateRibbon,
  StatTile,
  StepTrail,
  StreakCount,
  Tile,
  UnlockMeter,
  XpCoin,
  XpTrack,
  GAME_STATES,
  STATE_LABEL,
  type Requirement,
} from "@/components/game";
import { Button, SampleTag, SelectField, Stage, TextField, buttonStyles } from "@/components/ui";
import { cn } from "@/components/ui/cn";

// ---------------------------------------------------------------------------------------------------------------------
// demo data (spec 3.4, 3.6, 3.7, 7.2, 8.3, 9.3; the sample CV of 6.2)

const LEVELS = [
  { level: 1, title: "مبتدئ", from: 0 },
  { level: 2, title: "مستكشف", from: 150 },
  { level: 3, title: "مجتهد", from: 350 },
  { level: 4, title: "متمكّن", from: 600 },
  { level: 5, title: "محترف", from: 1000 },
  { level: 6, title: "خبير", from: 1600 },
  { level: 7, title: "أسطورة", from: 2500 },
] as const;

function levelOf(total: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1]!.from) i++;
  const here = LEVELS[i]!;
  const next = LEVELS[i + 1];
  return { level: here.level, title: here.title, from: here.from, to: next ? next.from : null, nextTitle: next?.title };
}

const DATA_ANALYST: Requirement[] = [
  { name: "Excel", have: 2, need: 2 },
  { name: "SQL", have: 2, need: 2 },
  { name: "Power BI", have: 0, need: 1 },
  { name: "الإحصاء", have: 1, need: 2 },
  { name: "التواصل الفعّال", have: 1, need: 1 },
];

interface DemoJob {
  id: string;
  icon: ReactNode;
  title: string;
  company: string;
  city: string;
  experience: string;
  match: number;
  skills: Requirement[];
  target?: boolean;
}

const JOBS: DemoJob[] = [
  { id: "data-analyst-riyadh", icon: <IconFieldData size={22} />, title: "محلل بيانات", company: "وادي الغيم للبيانات", city: "الرياض", experience: "حتى سنة خبرة", match: 70, skills: DATA_ANALYST, target: true },
  {
    id: "business-analyst-riyadh",
    icon: <IconFieldBusiness size={22} />,
    title: "محلل أعمال",
    company: "ركن الحبر الأخضر للاستشارات",
    city: "الرياض",
    experience: "حتى سنة خبرة",
    match: 60,
    skills: [
      { name: "إدارة المشاريع", have: 0, need: 1 },
      { name: "تحليل الأعمال", have: 0, need: 1 },
      { name: "Excel", have: 2, need: 2 },
      { name: "SQL", have: 2, need: 1 },
      { name: "الإنجليزية المهنية", have: 2, need: 2 },
    ],
  },
  {
    id: "financial-analyst-riyadh",
    icon: <IconFieldBusiness size={22} />,
    title: "محلل مالي",
    company: "دفاتر الزمرد للمحاسبة",
    city: "الرياض",
    experience: "خبرة 1-3 سنوات",
    match: 53,
    skills: [
      { name: "المحاسبة", have: 0, need: 1 },
      { name: "التحليل المالي", have: 0, need: 2 },
      { name: "Excel", have: 2, need: 3 },
      { name: "العرض والتقديم", have: 1, need: 1 },
      { name: "الإنجليزية المهنية", have: 2, need: 2 },
    ],
  },
  {
    id: "reporting-specialist-jeddah",
    icon: <IconFieldData size={22} />,
    title: "أخصائي تقارير وبيانات",
    company: "مرفأ الحوت الأبيض للخدمات اللوجستية",
    city: "جدة",
    experience: "حتى سنة خبرة",
    match: 50,
    skills: [
      { name: "Excel", have: 2, need: 2 },
      { name: "Power BI", have: 0, need: 1 },
      { name: "الإحصاء", have: 1, need: 2 },
      { name: "تصوير البيانات", have: 0, need: 1 },
      { name: "التواصل الفعّال", have: 1, need: 1 },
    ],
  },
  {
    id: "qa-tester-dammam",
    icon: <IconFieldSoftware size={22} />,
    title: "مختبِر برمجيات",
    company: "قلعة الموج الهادئ للأنظمة",
    city: "الدمام",
    experience: "حتى سنة خبرة",
    match: 50,
    skills: [
      { name: "أساسيات البرمجة", have: 1, need: 2 },
      { name: "Git", have: 0, need: 1 },
      { name: "حل المشكلات", have: 0, need: 1 },
      { name: "الإنجليزية المهنية", have: 2, need: 1 },
      { name: "العمل الجماعي", have: 1, need: 1 },
    ],
  },
  {
    id: "project-coordinator-jeddah",
    icon: <IconFieldBusiness size={22} />,
    title: "منسّق مشاريع",
    company: "قافلة الفجر للمشاريع",
    city: "جدة",
    experience: "حتى سنة خبرة",
    match: 50,
    skills: [
      { name: "إدارة المشاريع", have: 0, need: 2 },
      { name: "Agile", have: 0, need: 1 },
      { name: "التواصل الفعّال", have: 1, need: 2 },
      { name: "العمل الجماعي", have: 1, need: 1 },
      { name: "Excel", have: 2, need: 1 },
    ],
  },
];

interface DemoSkill {
  id: string;
  name: string;
  stars: number;
  slots: 1 | 2 | 3;
  evidence: string;
}

const CV_GROUPS: { field: string; icon: ReactNode; skills: DemoSkill[] }[] = [
  {
    field: "البيانات والتحليل",
    icon: <IconFieldData size={20} />,
    skills: [
      { id: "excel", name: "Excel", stars: 2, slots: 3, evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية." },
      { id: "sql", name: "SQL", stars: 2, slots: 3, evidence: "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات." },
      { id: "statistics", name: "الإحصاء", stars: 1, slots: 2, evidence: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python." },
    ],
  },
  {
    field: "تطوير البرمجيات",
    icon: <IconFieldSoftware size={20} />,
    skills: [{ id: "programming", name: "أساسيات البرمجة", stars: 1, slots: 2, evidence: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python." }],
  },
  {
    field: "المهارات المهنية",
    icon: <IconFieldProfessional size={20} />,
    skills: [
      { id: "english", name: "الإنجليزية المهنية", stars: 2, slots: 2, evidence: "الإنجليزية: جيد جداً." },
      { id: "communication", name: "التواصل الفعّال", stars: 1, slots: 2, evidence: "التواصل، العمل الجماعي، العرض والتقديم." },
      { id: "presentation", name: "العرض والتقديم", stars: 1, slots: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم." },
      { id: "teamwork", name: "العمل الجماعي", stars: 1, slots: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم." },
    ],
  },
];

/** A demo job as DestinationCard props (its id is a key, not a DOM attribute). */
function jobProps(j: DemoJob) {
  const { id: _id, ...rest } = j;
  return rest;
}

const POWERBI = { title: "أساسيات Power BI: من البيانات إلى لوحة المعلومات", skill: "Power BI", star: 1, hours: 10, lessons: 5, xp: 200 };
const STATS = { title: "الإحصاء التطبيقي للمحللين", skill: "الإحصاء", star: 2, hours: 12, lessons: 5, xp: 240 };

// ---------------------------------------------------------------------------------------------------------------------
// gallery scaffolding

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5" data-section={id} id={id}>
      <header className="flex flex-col gap-1 border-b-2 border-fg pb-2" dir="ltr">
        <h2 className="text-h3 text-fg">{title}</h2>
        {note ? <p className="max-w-4xl text-small text-fg-2">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Cap({ children }: { children: ReactNode }) {
  return (
    <p className="text-caption font-normal text-fg-3" dir="ltr">
      {children}
    </p>
  );
}

function Cell({ cap, children, className }: { cap: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <Cap>{cap}</Cap>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. Tile and its states

function TileStates() {
  return (
    <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
      {GAME_STATES.map((s) => (
        <Cell cap={`Tile state="${s}"`} key={s}>
          <Tile faceClassName="gap-1 p-4 pt-6" ribbon={<StateRibbon state={s} />} state={s}>
            <span className="text-title">{s === "locked" ? "تحليل البيانات بـ Python" : s === "done" ? "Excel ★★" : "أساسيات Power BI"}</span>
            <span className="text-small text-fg-2">
              {s === "locked" ? "تتطلب: أساسيات البرمجة" : s === "done" ? "من سيرتك" : s === "progress" ? "2 من 5 دروس" : "10 ساعات · 5 دروس"}
            </span>
          </Tile>
        </Cell>
      ))}
      <Cell cap="selected (a toggle that is on)">
        <Tile faceClassName="gap-1 p-4" selected>
          <span className="text-title">الأرقام والبيانات</span>
          <span className="text-small">اخترتها</span>
        </Tile>
      </Cell>
      <Cell cap="interactive={false} (read, not pressed: flat)">
        <Tile faceClassName="gap-1 p-4" interactive={false}>
          <span className="text-title">بطاقة للقراءة</span>
          <span className="text-small text-fg-2">لا عمق لما لا يُضغط</span>
        </Tile>
      </Cell>
      <Cell cap="pressed (the press frame, «دليلك» pressing)">
        <Tile faceClassName="gap-1 p-4" pressed>
          <span className="text-title">مضغوطة الآن</span>
          <span className="text-small text-fg-2">الوجه نزل على قاعدته</span>
        </Tile>
      </Cell>
      <Cell cap='depth="lg" radius="sheet"'>
        <Tile depth="lg" faceClassName="gap-1 p-5" radius="sheet">
          <span className="text-h3">قطعة كبيرة</span>
        </Tile>
      </Cell>
      <Cell cap='depth="sm" radius="full"'>
        <div className="flex flex-wrap gap-3">
          <Tile depth="sm" faceClassName="h-11 flex-row items-center px-4 font-semibold" radius="full">
            الرياض
          </Tile>
          <Tile depth="sm" faceClassName="h-11 flex-row items-center px-4 font-semibold" radius="full" state="next">
            التالية
          </Tile>
        </div>
      </Cell>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Ribbons and rewards

function Ribbons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {GAME_STATES.map((s) => (
        <StateRibbon key={s} state={s} />
      ))}
      <StateRibbon state="progress">جارية · 2 من 5</StateRibbon>
      <StateRibbon icon={null} state="next" tone="accent">
        هدفك
      </StateRibbon>
      <StateRibbon state="done">قدّمت</StateRibbon>
      <StateRibbon state="done" tone="quiet">
        مثبتة
      </StateRibbon>
      <StateRibbon size="md" state="next">
        التالية
      </StateRibbon>
    </div>
  );
}

function Rewards() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <RewardChip value={200} />
        <RewardChip status="earned" value={200} />
        <RewardChip label="عند التقديم" value={40} />
        <RewardChip label="من 60% مطابقة" status="locked" value={40} />
        <RewardChip label="مكافأة اليوم" value={60} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RewardChip kind="star" label={<>في <bdi dir="ltr">Power BI</bdi></>} value={1} />
        <RewardChip kind="star" label={<>في <bdi dir="ltr">Power BI</bdi></>} status="earned" value={1} />
        <RewardChip kind="star" label="في الإحصاء" status="locked" value={2} />
        <RewardChip kind="match" value={20} />
        <RewardChip kind="match" status="earned" value={20} />
        <RewardChip kind="match" status="locked" value={10} />
        <RewardChip kind="badge" label="أول دورة" />
        <RewardChip kind="badge" label="أول تقديم" status="earned" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <RewardChip size="sm" value={200} />
        <RewardChip size="md" value={200} />
        <RewardChip size="lg" value={200} />
        <XpCoin size={28} />
        <XpCoin size={40} />
        <XpCoin size={56} />
      </div>
      <RewardRow>
        <RewardChip size="sm" value={200} />
        <RewardChip kind="star" label={<>في <bdi dir="ltr">Power BI</bdi></>} size="sm" value={1} />
        <RewardChip kind="match" size="sm" value={20} />
      </RewardRow>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Gems and meters

function GemsAndMeters() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Cell cap="SkillGem: met · partial · locked (against a requirement) · owned (a collection) · md">
        <div className="flex flex-wrap gap-2">
          <SkillGem have={2} name="Excel" need={2} />
          <SkillGem have={1} name="الإحصاء" need={2} />
          <SkillGem have={0} name="Power BI" need={1} />
          <LockedGem name="تصوير البيانات" />
          <SkillGem have={2} name="SQL" slots={3} />
          <SkillGem have={1} icon={<IconFieldData size={18} />} name="التواصل الفعّال" need={1} size="md" />
          <SkillGem have={0} name="التحليل المالي" need={2} size="md" />
        </div>
      </Cell>
      <Cell cap="UnlockMeter: محلل بيانات 70% (Power BI empty, الإحصاء half) · 90% · 100% (the lock opens)">
        <div className="flex flex-col gap-5">
          <UnlockMeter skills={DATA_ANALYST} value={70} />
          <UnlockMeter skills={DATA_ANALYST.map((s) => (s.name === "Power BI" ? { ...s, have: 1 } : s))} value={90} />
          <UnlockMeter skills={DATA_ANALYST.map((s) => ({ ...s, have: s.need }))} value={100} />
        </div>
      </Cell>
      <Cell cap="UnlockMeter labels (the job page, the featured card)">
        <UnlockMeter labels size="md" skills={DATA_ANALYST} value={70} />
      </Cell>
      <Cell cap="LessonMeter · CollectionMeter (8 of 38 skills)">
        <div className="flex flex-col gap-5">
          <LessonMeter done={2} total={5} />
          <CollectionMeter have={8} total={38} />
        </div>
      </Cell>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Quests

function Quests() {
  return (
    <div className="grid gap-x-5 gap-y-8 md:grid-cols-2">
      <Cell cap='QuestCard state="next" (the one current stage: accent key, ribbon, station token)'>
        <QuestCard {...POWERBI} matchGain={20} stageNumber={7} state="next" />
      </Cell>
      <Cell cap='state="available" (an upcoming stage you may take early)'>
        <QuestCard {...STATS} matchGain={10} stageNumber={8} state="available" />
      </Cell>
      <Cell cap='state="next" with progress (rule 2: «أكمل ما بدأته»)'>
        <QuestCard {...STATS} matchGain={10} progress={2} stageNumber={8} state="next" />
      </Cell>
      <Cell cap='state="done" (pressed home, stamped, the rewards earned)'>
        <QuestCard {...POWERBI} matchGain={20} note="أكملتها اليوم" stageNumber={7} state="done" />
      </Cell>
      <Cell cap='state="locked" (a dashed well, the reason, the rewards visible but locked)'>
        <QuestCard hours={10} icon={<IconFieldData size={20} />} lessons={5} lockedReason="مقفلة: تتطلب النجمة 1 في أساسيات البرمجة" skill="تحليل البيانات بـ Python" star={1} state="locked" title="تحليل البيانات بـ Python: البداية" xp={200} />
      </Cell>
      <Cell cap="credited «مثبتة» (the CV proved it: no rewards, the source)">
        <QuestCard
          credited
          hours={8}
          icon={<IconFieldData size={20} />}
          lessons={4}
          note={
            <>
              من سيرتك: <span className="bg-mark px-0.5 text-fg">«تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel…»</span>
            </>
          }
          skill="Excel"
          star={2}
          state="done"
          title="Excel المتقدم: الجداول المحورية والدوال"
          xp={160}
        />
      </Cell>
      <Cell cap="with its own action (flat card: the button is the pressable piece)" className="md:col-span-2">
        <div className="max-w-xl">
          <QuestCard
            {...POWERBI}
            action={
              <>
                <Button icon={<IconArrowForward size={20} />}>ابدأ الدورة</Button>
                <Button variant="ghost">افتح الدورة</Button>
              </>
            }
            matchGain={20}
            stageNumber={7}
            state="next"
          />
        </div>
      </Cell>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. Destinations

function Destinations() {
  const [a, b, c] = JOBS;
  return (
    <div className="grid gap-x-5 gap-y-8 md:grid-cols-2">
      <Cell cap="DestinationCard featured target (the jobs page top, the CV results)" className="md:col-span-2">
        <DestinationCard {...jobProps(a!)} featured />
      </Cell>
      <Cell cap="target, list form">
        <DestinationCard {...jobProps(a!)} />
      </Cell>
      <Cell cap="60%: the +40 XP for applying is open">
        <DestinationCard {...jobProps(b!)} />
      </Cell>
      <Cell cap="53%: the reward is locked under 60%">
        <DestinationCard {...jobProps(c!)} />
      </Cell>
      <Cell cap="applied (settled, pressed home, +40 XP earned)">
        <DestinationCard {...jobProps(a!)} applied={{ status: "قيد المراجعة · محاكاة", xp: 40 }} match={90} skills={DATA_ANALYST.map((s) => (s.name === "Power BI" ? { ...s, have: 1 } : s))} target={false} />
      </Cell>
      <Cell cap="target at 100%: ready to apply, the lock open">
        <DestinationCard {...jobProps(a!)} match={100} skills={DATA_ANALYST.map((s) => ({ ...s, have: s.need }))} />
      </Cell>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. HUD

function Hud() {
  const l2 = levelOf(180);
  const l3 = levelOf(420);
  return (
    <div className="flex flex-col gap-8">
      <Cell cap="LevelToken 1..7 (ink, never brass) · sm md lg">
        <div className="flex flex-wrap items-center gap-3">
          {LEVELS.map((l) => (
            <LevelToken key={l.level} level={l.level} />
          ))}
          <LevelToken level={3} size="sm" />
          <LevelToken level={3} size="lg" />
        </div>
      </Cell>
      <div className="grid gap-8 lg:grid-cols-2">
        <Cell cap="XpTrack md: 180 / 350 (level 2 «مستكشف»)">
          <XpTrack {...l2} showRemaining total={180} />
        </Cell>
        <Cell cap="XpTrack md: 420 / 600 · top level">
          <div className="flex flex-col gap-5">
            <XpTrack {...l3} showRemaining total={420} />
            <XpTrack from={2500} level={7} showRemaining title="أسطورة" to={null} total={2610} />
          </div>
        </Cell>
      </div>
      <Cell cap="PlayerChip (top bar, spec 2.7) · compact (phone)">
        <div className="flex flex-wrap items-center gap-4">
          <PlayerChip avatar="av-01" name="خالد" streak={1} total={180} {...l2} />
          <PlayerChip avatar="av-01" compact name="خالد" streak={1} total={180} {...l2} />
        </div>
      </Cell>
      <div className="grid gap-8 lg:grid-cols-2">
        <Cell cap="PlayerCard (home column top, profile hero)">
          <PlayerCard avatar="av-01" badges={{ have: 3, total: 12 }} name="خالد" nextReward={40} rank={18} streak={1} total={180} {...l2} />
        </Cell>
        <Cell cap="DailyTrack (spec 8.4: 20 × day, max 100): streak 3 unclaimed · streak 1 · streak 5 claimed">
          <div className="flex flex-col gap-5">
            <DailyTrack days={dailyDays(3, false)} />
            <DailyTrack days={dailyDays(1, true)} />
            <DailyTrack days={dailyDays(5, true)} />
          </div>
        </Cell>
      </div>
      <Cell cap="StatTile row (profile) · StreakCount">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile icon={<IconXp size={18} waypoint="off" />} label="XP" tone="xp" value={420} />
          <StatTile icon={<IconStar size={18} waypoint="off" />} label="النجوم" value={12} />
          <StatTile icon={<IconCv size={18} waypoint="off" />} label="الدورات المكتملة" value={1} />
          <StatTile icon={<IconStreak size={18} waypoint="off" />} label="سلسلة الأيام" value={1} />
          <StatTile icon={<IconLeaderboard size={18} waypoint="off" />} label="ترتيب الأسبوع" value={10} />
        </div>
        <div className="flex items-center gap-6">
          <StreakCount days={4} label="أيام متتالية" />
          <StreakCount days={1} size="sm" />
        </div>
      </Cell>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 7. Onboarding pieces

function Onboarding() {
  const [picked, setPicked] = useState<string | null>("riyadh");
  const cities = [
    { id: "riyadh", label: "الرياض" },
    { id: "jeddah", label: "جدة" },
    { id: "dammam", label: "الدمام" },
    { id: "makkah", label: "مكة المكرمة" },
    { id: "madinah", label: "المدينة المنورة" },
    { id: "other", label: "مدينة أخرى" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Cell cap="StepTrail 1 · 3 · 6 · done">
        <div className="flex max-w-md flex-col gap-4">
          <StepTrail current={1} total={6} />
          <StepTrail current={3} total={6} />
          <StepTrail current={6} total={6} />
          <StepTrail current={7} label="اكتمل ملفك" total={6} />
        </div>
      </Cell>
      <Cell cap="AnswerTile (press one: it stays pressed home in ink)">
        <div className="flex flex-wrap gap-2.5">
          {cities.map((c) => (
            <AnswerTile data-testid={`game-answer-${c.id}`} key={c.id} onClick={() => setPicked(c.id)} selected={picked === c.id}>
              {c.label}
            </AnswerTile>
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <AnswerTile icon={<IconFieldData size={20} />}>الأرقام والبيانات</AnswerTile>
          <AnswerTile icon={<IconFieldSoftware size={20} />}>بناء المواقع والتطبيقات</AnswerTile>
          <AnswerTile icon={<IconFieldBusiness size={20} />} size="sm">
            تنظيم الأعمال والمشاريع
          </AnswerTile>
        </div>
      </Cell>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 8. Loot

function Loot() {
  const [run, setRun] = useState(0);
  const skills = CV_GROUPS.flatMap((g) => g.skills.map((s) => ({ ...s, icon: g.icon })));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button data-testid="game-loot-replay" onClick={() => setRun((r) => r + 1)} size="sm" variant="secondary">
          Replay the loot reveal
        </Button>
        <Cap>LootReveal lands the cards one after another (pop, 60 ms apart, under 480 ms); the last star of each lands.</Cap>
      </div>
      <LootReveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" key={run} play={run > 0}>
        {skills.map((s, i) => (
          <LootCard delay={0.3 + i * 0.06} evidence={s.evidence} fresh={run > 0} icon={s.icon} key={s.id} name={s.name} slots={s.slots} stars={s.stars} />
        ))}
      </LootReveal>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 9. Live: the moving pieces, with their causes

function Live() {
  const [total, setTotal] = useState(180);
  const [quest, setQuest] = useState<"next" | "done">("next");
  const [powerbi, setPowerbi] = useState(0);
  const [stats, setStats] = useState(1);
  const l = levelOf(total);
  const skills = DATA_ANALYST.map((s) => (s.name === "Power BI" ? { ...s, have: powerbi } : s.name === "الإحصاء" ? { ...s, have: stats } : s));
  const match = 20 + 20 + powerbi * 20 + stats * 10 + 20;
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <Cell cap="The XP landing: the track fills in counted steps while the number counts; 180 → 380 crosses level 3 (old sheet fills, cut, new sheet)">
          <div className="flex flex-wrap gap-2">
            <Button data-testid="game-xp-course" onClick={() => setTotal((t) => t + 200)} size="sm" variant="secondary">
              أكملت دورة: <bdi dir="ltr">+200 XP</bdi>
            </Button>
            <Button data-testid="game-xp-apply" onClick={() => setTotal((t) => t + 40)} size="sm" variant="secondary">
              قدّمت: <bdi dir="ltr">+40 XP</bdi>
            </Button>
            <Button data-testid="game-xp-reset" onClick={() => setTotal(180)} size="sm" variant="ghost">
              Reset
            </Button>
          </div>
          <PlayerChip avatar="av-01" name="خالد" streak={1} total={total} {...l} />
          <div data-testid="game-live-player">
            <PlayerCard avatar="av-01" badges={{ have: 3, total: 12 }} name="خالد" nextReward={40} rank={total >= 380 ? 10 : 18} streak={1} total={total} {...l} />
          </div>
        </Cell>
        <div className="flex flex-col gap-8">
          <Cell cap="A quest completes: the face presses home, the stamp lands, the rewards turn earned (they pop)">
            <div className="flex flex-wrap gap-2">
              <Button data-testid="game-quest-complete" onClick={() => setQuest("done")} size="sm" variant="secondary">
                أكمل الدورة
              </Button>
              <Button data-testid="game-quest-reset" onClick={() => setQuest("next")} size="sm" variant="ghost">
                Reset
              </Button>
            </div>
            <div data-testid="game-live-quest">
              <QuestCard {...POWERBI} matchGain={20} note={quest === "done" ? "أكملتها الآن" : undefined} stageNumber={7} stampPlay={quest === "done"} state={quest} />
            </div>
          </Cell>
          <Cell cap="A star lands, the meter fills, the ring rises; at 100% the lock opens">
            <div className="flex flex-wrap gap-2">
              <Button data-testid="game-unlock-powerbi" onClick={() => setPowerbi(1)} size="sm" variant="secondary">
                أكملت Power BI
              </Button>
              <Button data-testid="game-unlock-stats" onClick={() => setStats(2)} size="sm" variant="secondary">
                أكملت الإحصاء
              </Button>
              <Button
                data-testid="game-unlock-reset"
                onClick={() => {
                  setPowerbi(0);
                  setStats(1);
                }}
                size="sm"
                variant="ghost"
              >
                Reset
              </Button>
            </div>
            <div data-testid="game-live-destination">
              <DestinationCard {...jobProps(JOBS[0]!)} match={match} skills={skills} />
            </div>
          </Cell>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 10. MOCK: the jobs page as a board of destinations

function MockTopBar({ title }: { title: string }) {
  const l = levelOf(180);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <h1 className="text-h1 text-fg">{title}</h1>
      <div className="hidden lg:block">
        <PlayerChip avatar="av-01" name="خالد" streak={1} total={180} {...l} />
      </div>
      <div className="lg:hidden">
        <PlayerChip avatar="av-01" compact name="خالد" streak={1} total={180} {...l} />
      </div>
    </div>
  );
}

function MockJobs() {
  const [target, ...rest] = JOBS;
  const open = JOBS.filter((j) => j.match >= 60).length;
  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 overflow-hidden rounded-sheet border border-border bg-bg p-gutter py-6" data-testid="mock-jobs">
      <MockTopBar title="الوظائف" />
      <header className="flex flex-col gap-2">
        <p className="text-body text-fg-2">كل وظيفة ومعها نسبة مطابقتك لها، وما ينقصك لتفتحها.</p>
        <p className="flex flex-wrap items-center gap-2 text-small text-fg-3">
          <SampleTag />
          الوظائف والجهات هنا للعرض فقط.
        </p>
      </header>

      {/* the real reward of applying (spec 8.1), stated once at the top of the board */}
      <Tile faceClassName="flex-row flex-wrap items-center gap-3 px-4 py-3" interactive={false} state="available">
        <XpCoin size={36} />
        <p className="min-w-0 flex-1 text-small text-fg-2">
          <span className="font-semibold text-fg">قدّم حين تبلغ مطابقتك 60% أو أكثر، وتكسب </span>
          <bdi className="font-bold text-xp-fg" dir="ltr">
            +40 XP
          </bdi>
          <span className="font-semibold text-fg"> عن كل تقديم مدروس.</span> مفتوحة لك الآن: {open === 2 ? "وظيفتان" : `${open} وظائف`}.
        </p>
      </Tile>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <TextField className="md:flex-1" hideLabel icon={<IconSearch size={20} />} label="ابحث" placeholder="ابحث بالمسمى أو المهارة أو الجهة" />
        <div className="grid grid-cols-2 gap-3 md:flex">
          <SelectField hideLabel icon={<IconLocation size={20} />} items={[{ value: "all", label: "كل المدن" }]} label="المدينة" size="sm" value="all" />
          <SelectField hideLabel icon={<IconFilter size={20} />} items={[{ value: "all", label: "كل المجالات" }]} label="المجال" size="sm" value="all" />
        </div>
      </div>
      <p className="text-small text-fg-2">20 وظيفة · مرتّبة حسب المطابقة</p>

      <DestinationCard {...jobProps(target!)} featured />
      <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
        {rest.map((j) => (
          <DestinationCard key={j.id} {...jobProps(j)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 11. MOCK: the CV results as loot

function MockCv() {
  const [target, second, third] = JOBS;
  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 overflow-hidden rounded-sheet border border-border bg-bg p-gutter py-6" data-testid="mock-cv">
      <MockTopBar title="سيرتي الذاتية" />
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-h1 text-fg">في السيرة التجريبية 8 مهارات</h2>
            <SampleTag kind="cv" />
          </div>
          <p className="text-small text-fg-3">القراءة: محلّل محلي بالكلمات المفتاحية</p>
        </div>
        {/* the haul: what this analysis gave you, as a results screen (all real numbers: 8 skills, 11 stars, +100 XP) */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
          <Tile faceClassName="gap-4 p-card" interactive={false}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-h2 font-bold text-fg tabular-nums">8</span>
                <span className="text-small text-fg-2">مهارات اكتشفتها</span>
              </div>
              <div className="flex flex-col gap-0.5 border-s border-border ps-3">
                <span className="flex items-center gap-1.5 text-h2 font-bold text-fg tabular-nums">
                  11 <IconStar className="text-fg" size={22} waypoint="off" />
                </span>
                <span className="text-small text-fg-2">نجمة في رصيدك</span>
              </div>
              <div className="col-span-2 flex flex-row items-center gap-2 border-t border-border pt-3 sm:col-span-1 sm:flex-col sm:items-start sm:gap-1.5 sm:border-t-0 sm:border-s sm:pt-0 sm:ps-3">
                <span className="flex items-center gap-2 text-h2 font-bold text-xp-fg tabular-nums">
                  <XpCoin size={30} />
                  <bdi dir="ltr">+100 XP</bdi>
                </span>
                <span className="text-small text-fg-2">كسبتها بتحليل سيرتك</span>
              </div>
            </div>
            <CollectionMeter have={8} total={38} />
          </Tile>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
        <div className="flex flex-col gap-6">
          {CV_GROUPS.map((g) => (
            <section className="flex flex-col gap-3" key={g.field}>
              <h3 className="flex items-center gap-2 text-title text-fg">
                <span className="text-fg-2">{g.icon}</span>
                {g.field}
                <span className="text-small font-normal text-fg-3">· {g.skills.length === 1 ? "مهارة واحدة" : `${g.skills.length} مهارات`}</span>
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {g.skills.map((s) => (
                  <LootCard evidence={s.evidence} icon={g.icon} key={s.id} name={s.name} slots={s.slots} stars={s.stars} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <section className="flex flex-col gap-3">
            <h3 className="text-title text-fg">هدفك بعد التحليل</h3>
            <DestinationCard {...jobProps(target!)} applyReward={null} matchFrom={0} />
            <div className="flex flex-col gap-2">
              <Button icon={<IconArrowForward size={20} />} size="lg">
                اذهب إلى مساري
              </Button>
              <p className="text-small text-fg-2">
                التالي: دورة «أساسيات <bdi dir="ltr">Power BI</bdi>» ترفعك إلى 90%.
              </p>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-title text-fg">أفضل الوظائف لمهاراتك</h3>
            {[second!, third!].map((j) => (
              <div className="flex flex-col gap-2" key={j.id}>
                <DestinationCard {...jobProps(j)} maxGems={2} />
                <div className="flex flex-wrap items-center gap-3 ps-1">
                  <span className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    <IconAdvisor size={18} />
                    دع دليلك يقدّم عنك
                  </span>
                  <span className={buttonStyles({ variant: "ghost", size: "sm" })}>اجعلها هدفي</span>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// the stage: the same pieces on the dark surface (they flip by themselves)

function OnStage() {
  const l2 = levelOf(180);
  return (
    <Stage className="rounded-sheet px-gutter py-8" contour="quiet">
      <div className="relative grid gap-x-5 gap-y-8 lg:grid-cols-2">
        <Cell cap="QuestCard next · available · done · locked">
          <div className="flex flex-col gap-6">
            <QuestCard {...POWERBI} matchGain={20} stageNumber={7} state="next" />
            <QuestCard {...STATS} matchGain={10} stageNumber={8} state="available" />
          </div>
        </Cell>
        <Cell cap="DestinationCard · PlayerCard">
          <div className="flex flex-col gap-6">
            <DestinationCard {...jobProps(JOBS[0]!)} />
            <PlayerCard avatar="av-01" badges={{ have: 3, total: 12 }} name="خالد" nextReward={40} rank={18} streak={1} total={180} {...l2} />
          </div>
        </Cell>
        <Cell cap="Tiles in five states · ribbons · rewards">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {GAME_STATES.map((s) => (
              <Tile faceClassName="gap-1 p-3 pt-5" key={s} ribbon={<StateRibbon state={s} />} state={s}>
                <span className="text-small font-semibold">{STATE_LABEL[s]}</span>
              </Tile>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <RewardChip value={200} />
            <RewardChip status="earned" value={100} />
            <RewardChip label="من 60% مطابقة" status="locked" value={40} />
            <RewardChip kind="star" label={<>في <bdi dir="ltr">Power BI</bdi></>} value={1} />
            <RewardChip kind="match" value={20} />
          </div>
        </Cell>
        <Cell cap="Gems · meter · track · daily · answers · steps">
          <div className="flex flex-wrap gap-2">
            <SkillGem have={2} name="Excel" need={2} />
            <SkillGem have={1} name="الإحصاء" need={2} />
            <SkillGem have={0} name="Power BI" need={1} />
          </div>
          <UnlockMeter skills={DATA_ANALYST} value={70} />
          <XpTrack {...l2} showRemaining total={180} />
          <DailyTrack days={dailyDays(3, false)} />
          <div className="flex flex-wrap gap-2.5">
            <AnswerTile selected>الرياض</AnswerTile>
            <AnswerTile>جدة</AnswerTile>
          </div>
          <StepTrail current={3} total={6} />
          <PlayerChip avatar="av-01" name="خالد" streak={1} total={180} {...l2} />
        </Cell>
      </div>
    </Stage>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

export default function GameGallery() {
  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-14 px-gutter py-10">
      <header className="flex flex-col gap-2" dir="ltr">
        <p className="text-caption text-fg-3">Dalilak · game layer · /dev/game</p>
        <h1 className="text-h1 text-fg">The game layer: you are the player, the path is the board</h1>
        <p className="max-w-4xl text-body text-fg-2">
          Courses are quests, jobs are destinations you unlock skill by skill, skills are pieces you collect, and every piece speaks one state language:
          raised on an ink plinth when there is something to do (it sinks when pressed), pressed home flat when it is done, a dashed well when it is locked.
          Brass is XP and rewards only; coral is only your position and your next action. Docs: docs/GAME-LAYER.md.
        </p>
      </header>

      <Section id="tile" note="Raised = there is something to do (it sinks onto its plinth when pressed). Flat = done (pressed home) or locked (a dashed well). The one `next` piece stands on the accent key." title="1 · Tile and the five states">
        <TileStates />
      </Section>
      <Section id="rewards" note="The real rewards of spec 8.1 only: course XP, the star, the match gain, +40 XP for applying at 60%+, the daily reward, badges. Offer · earned · locked." title="2 · StateRibbon and RewardChip">
        <Ribbons />
        <Rewards />
      </Section>
      <Section id="meters" note="A job's five requirements are the five segments of its unlock meter (spec 7.2: each 20 points, filled by stars held ÷ stars required). Missing skills are locked gems." title="3 · SkillGem and the meters">
        <GemsAndMeters />
      </Section>
      <Section id="quests" note="A course as a quest: what you do, what it costs, what you get, where it stands. The station token carries its stage number from the map." title="4 · QuestCard">
        <Quests />
      </Section>
      <Section id="destinations" note="A job as a destination: the ring stays the one number; the meter explains it; the reward for applying is on the card." title="5 · DestinationCard">
        <Destinations />
      </Section>
      <Section id="hud" note="The player at a glance: level token, segmented XP track, streak, rank, the next real reward." title="6 · HUD: PlayerChip, PlayerCard, XpTrack, DailyTrack, StatTile">
        <Hud />
      </Section>
      <Section id="onboarding" note="Answers are pieces you press; the six questions are a trail of six stops." title="7 · Onboarding: AnswerTile, StepTrail">
        <Onboarding />
      </Section>
      <Section id="loot" note="The CV results as loot: every skill found is a card you collected, with its stars and the sentence that proves it." title="8 · LootCard and LootReveal">
        <Loot />
      </Section>
      <Section id="live" note="Press the buttons. Each motion has a cause; nothing moves at rest." title="9 · Live: the moving pieces">
        <Live />
      </Section>
      <Section id="stage" note="The same pieces inside a Stage: they flip by themselves (outline and plinth become stage-3; the accent key and brass stay)." title="10 · On the stage">
        <OnStage />
      </Section>
      <Section id="mock-jobs" note="Static mock built only from game pieces and the kit. The target is featured with its meter written out; every other job is a destination card with its locked gems and its apply reward." title="11 · MOCK: the jobs page, redesigned">
        <MockJobs />
      </Section>
      <Section id="mock-cv" note="Static mock. The analysis ends in a haul: the reward earned, the collection count, every skill a card with its proof; beside it the target with its unlock meter and the one primary action." title="12 · MOCK: the CV results, redesigned">
        <MockCv />
      </Section>
    </main>
  );
}
