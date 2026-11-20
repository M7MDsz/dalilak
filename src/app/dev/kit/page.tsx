"use client";
// /dev/kit: the design system gallery. Tokens and type first, then every primitive in every state on paper, then the same
// kit inside a Stage. Owned by the design-system agent. Development only.
import dynamic from "next/dynamic";
import { Component, Suspense, useEffect, useState, type ReactNode } from "react";

import { BadgeEmblem, LevelEmblem } from "@/components/emblems";
import { IconArrowForward, IconClose, IconFilter, IconLocation, IconPlus, IconSearch, IconSend } from "@/components/icons";
import { Ring } from "@/components/motion";
import {
  BadgeMedal,
  Button,
  Card,
  Chip,
  ContourBackdrop,
  Divider,
  EmptyState,
  IconButton,
  Kbd,
  SampleTag,
  SelectField,
  SkillChip,
  SkillStars,
  Stage,
  Stamp,
  StreakFlame,
  StreakWeek,
  TextArea,
  TextField,
  Tooltip,
  XpBar,
  XpGlyph,
  XpValue,
  toast,
  type DayMark,
} from "@/components/ui";
import { cn } from "@/components/ui/cn";

// ---------------------------------------------------------------------------------------------------------------------
// data for the demos (spec 8.3 levels)

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

const CITIES = [
  { value: "riyadh", label: "الرياض" },
  { value: "jeddah", label: "جدة" },
  { value: "dammam", label: "الدمام" },
  { value: "remote", label: "عن بُعد" },
] as const;

const FIELDS = [
  { value: "all", label: "كل المجالات" },
  { value: "data", label: "البيانات والذكاء الاصطناعي" },
  { value: "software", label: "تطوير البرمجيات" },
  { value: "design", label: "التصميم" },
  { value: "marketing", label: "التسويق" },
] as const;

const WEEK: readonly DayMark[] = ["done", "done", "done", "today", "ahead", "ahead", "ahead"];
const WEEK_BROKEN: readonly DayMark[] = ["done", "missed", "done", "done", "done", "today", "ahead"];

// ---------------------------------------------------------------------------------------------------------------------
// gallery scaffolding

function Cell({ title, note, span = 4, children }: { title: string; note?: string; span?: 3 | 4 | 5 | 6 | 7 | 8 | 12; children: ReactNode }) {
  const spans = { 3: "lg:col-span-3", 4: "lg:col-span-4", 5: "lg:col-span-5", 6: "lg:col-span-6", 7: "lg:col-span-7", 8: "lg:col-span-8", 12: "lg:col-span-12" };
  return (
    <section className={cn("flex min-w-0 flex-col gap-4", spans[span])} data-cell={title.split(" ")[0]}>
      <header className="flex flex-col gap-0.5 border-b border-dotted border-border-strong pb-2" dir="ltr">
        <h3 className="text-small font-semibold text-fg">{title}</h3>
        {note ? <p className="text-caption font-normal text-fg-3">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="text-caption font-normal text-fg-3" dir="ltr">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// tokens

const SWATCHES: { group: string; items: { name: string; v: string; role: string }[] }[] = [
  {
    group: "Light working surfaces",
    items: [
      { name: "paper", v: "var(--color-paper)", role: "page" },
      { name: "sheet", v: "var(--color-sheet)", role: "cards, inputs" },
      { name: "sunk", v: "var(--color-sunk)", role: "wells, disabled" },
      { name: "line", v: "var(--color-line)", role: "hairlines" },
      { name: "line-strong", v: "var(--color-line-strong)", role: "control borders" },
      { name: "contour", v: "var(--color-contour)", role: "map lines" },
      { name: "contour-2", v: "var(--color-contour-2)", role: "index contours" },
      { name: "contour-ink", v: "var(--color-contour-ink)", role: "labels on a contour" },
    ],
  },
  {
    group: "Ink (text on light)",
    items: [
      { name: "ink", v: "var(--color-ink)", role: "titles, body" },
      { name: "ink-2", v: "var(--color-ink-2)", role: "body, meta" },
      { name: "ink-3", v: "var(--color-ink-3)", role: "captions, locked" },
      { name: "ink-4", v: "var(--color-ink-4)", role: "decoration only" },
    ],
  },
  {
    group: "The stage",
    items: [
      { name: "stage", v: "var(--color-stage)", role: "set pieces" },
      { name: "stage-2", v: "var(--color-stage-2)", role: "raised on stage" },
      { name: "stage-3", v: "var(--color-stage-3)", role: "lines on stage" },
      { name: "stage-contour", v: "var(--color-stage-contour)", role: "contour on stage" },
      { name: "stage-contour-2", v: "var(--color-stage-contour-2)", role: "index on stage" },
      { name: "on-stage", v: "var(--color-on-stage)", role: "text on stage" },
      { name: "on-stage-2", v: "var(--color-on-stage-2)", role: "secondary" },
      { name: "on-stage-3", v: "var(--color-on-stage-3)", role: "captions" },
    ],
  },
  {
    group: "Accent: your position and your next action",
    items: [
      { name: "accent", v: "var(--color-accent)", role: "waypoint, primary" },
      { name: "accent-hover", v: "var(--color-accent-hover)", role: "hover" },
      { name: "accent-press", v: "var(--color-accent-press)", role: "pressed" },
      { name: "accent-ink", v: "var(--color-accent-ink)", role: "accent text, light" },
      { name: "accent-on-stage", v: "var(--color-accent-on-stage)", role: "accent text, stage" },
      { name: "accent-soft", v: "var(--color-accent-soft)", role: "soft tint, your own small marks" },
      { name: "on-accent", v: "var(--color-on-accent)", role: "label on accent" },
    ],
  },
  {
    group: "XP (brass) and states",
    items: [
      { name: "xp", v: "var(--color-xp)", role: "XP fill, medals" },
      { name: "xp-line", v: "var(--color-xp-line)", role: "gold marks" },
      { name: "xp-ink", v: "var(--color-xp-ink)", role: "XP numerals, light" },
      { name: "xp-soft", v: "var(--color-xp-soft)", role: "reward tint" },
      { name: "xp-on-stage", v: "var(--color-xp-on-stage)", role: "XP on stage" },
      { name: "ok", v: "var(--color-ok)", role: "success" },
      { name: "ok-soft", v: "var(--color-ok-soft)", role: "success tint" },
      { name: "warn", v: "var(--color-warn)", role: "warning, error" },
      { name: "warn-soft", v: "var(--color-warn-soft)", role: "warning tint" },
      { name: "warn-on-stage", v: "var(--color-warn-on-stage)", role: "warning text, stage" },
    ],
  },
];

function Tokens() {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const g of SWATCHES) for (const s of g.items) next[s.name] = css.getPropertyValue(`--color-${s.name}`).trim();
    setValues(next);
  }, []);
  return (
    <div className="grid gap-6" dir="ltr">
      {SWATCHES.map((g) => (
        <div className="flex flex-col gap-3" key={g.group}>
          <h3 className="text-caption font-semibold text-fg-3">{g.group}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9">
            {g.items.map((s) => (
              <div className="flex flex-col gap-1.5" key={s.name}>
                <span className="h-12 rounded-control border border-border" style={{ background: s.v }} />
                <span className="text-small font-semibold text-fg">{s.name}</span>
                <span className="text-caption font-normal text-fg-3">
                  {values[s.name] ?? ""} · {s.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const TYPE = [
  { cls: "text-display", spec: "display 52 / 1.3 / 700", sample: "كل خطوة تقرّبك من وظيفتك" },
  { cls: "text-h1", spec: "h1 34 / 1.4 / 700", sample: "مسارك نحو محلل بيانات" },
  { cls: "text-h2", spec: "h2 24 / 1.5 / 700", sample: "الخطوة التالية: SQL للمبتدئين" },
  { cls: "text-h3", spec: "h3 20 / 1.55 / 700", sample: "أساسيات Power BI" },
  { cls: "text-title", spec: "title 17 / 1.6 / 600", sample: "تحليل البيانات بـ Python · تُفتح بعد SQL" },
  { cls: "text-body", spec: "body 16 / 1.85 / 400", sample: "ارفع سيرتك الذاتية، وسيقرأ دليل مهاراتك ويرسم لك الطريق من حيث تقف اليوم إلى وظيفة محلل بيانات. كل دورة تكملها ترفع مستوى مهارة، وتزيد تطابقك مع الوظيفة." },
  { cls: "text-small", spec: "small 14 / 1.7 / 400", sample: "شركة نخلة الرقمية · الرياض · دوام كامل" },
  { cls: "text-caption", spec: "caption 13 / 1.6 / 500", sample: "بيانات تجريبية · ح ن ث ر خ ج س · 1,000 1,100" },
] as const;

function TypeScale() {
  return (
    <div className="flex flex-col">
      {TYPE.map((t) => (
        <div className="grid grid-cols-1 items-baseline gap-2 border-b border-border py-4 last:border-b-0 lg:grid-cols-[1fr_14rem]" key={t.cls}>
          <p className={cn(t.cls, "text-fg", t.cls === "text-body" && "max-w-3xl text-fg-2")}>{t.sample}</p>
          <span className="text-caption font-normal text-fg-3 lg:text-end" dir="ltr">
            {t.cls} · {t.spec}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-1 items-baseline gap-2 py-4 lg:grid-cols-[1fr_14rem]">
        <p className="text-h3 text-fg">
          أكملت دورة SQL للمبتدئين <XpValue gain size="lg" value={200} />
        </p>
        <span className="text-caption font-normal text-fg-3 lg:text-end" dir="ltr">
          mixed line · Latin digits, tabular
        </span>
      </div>
    </div>
  );
}

const ALIASES = [
  ["bg", "var(--bg)"],
  ["surface", "var(--surface)"],
  ["surface-2", "var(--surface-2)"],
  ["border", "var(--border)"],
  ["border-strong", "var(--border-strong)"],
  ["fg", "var(--fg)"],
  ["fg-2", "var(--fg-2)"],
  ["fg-3", "var(--fg-3)"],
  ["fg-4", "var(--fg-4)"],
  ["solid", "var(--solid)"],
  ["accent-fg", "var(--accent-fg)"],
  ["xp-fg", "var(--xp-fg)"],
  ["ok-fg", "var(--ok-fg)"],
  ["warn-fg", "var(--warn-fg)"],
  ["contour-line", "var(--contour-line)"],
  ["hover", "var(--hover)"],
] as const;

function AliasColumn() {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8" dir="ltr">
      {ALIASES.map(([name, v]) => (
        <div className="flex flex-col gap-1" key={name}>
          <span className="h-9 rounded-tag border border-border" style={{ background: v }} />
          <span className="text-caption font-normal text-fg-2">{name}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// the kit, drawn once per surface

function ButtonsCell() {
  const [pressed, setPressed] = useState(false);
  const pressForMe = () => {
    setPressed(true);
    window.setTimeout(() => setPressed(false), 160);
  };
  return (
    <Cell
      note="rest · pressed (the pressed prop: Daleel presses it) · disabled · loading. Primary is a key: a 3 px edge that collapses on press; on hover its forward icon steps 2 px. Secondary and ghost icons carry a quiet dot."
      span={7}
      title="Button"
    >
      {(
        [
          ["primary", "ابدأ الآن", "أحلّل سيرتك"],
          ["secondary", "عرض التفاصيل", "أقدّم الآن"],
          ["ghost", "تخطَّ الآن", "أحفظ"],
        ] as const
      ).map(([variant, label, busy]) => (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3" key={variant}>
          <span className="w-full lg:w-20 lg:pt-3">
            <Tag>{variant}</Tag>
          </span>
          {(["rest", "pressed", "disabled", "loading"] as const).map((state) => (
            <figure className="flex flex-col items-center gap-1" key={state}>
              <Button
                disabled={state === "disabled"}
                icon={variant === "primary" ? <IconArrowForward size={20} /> : undefined}
                loading={state === "loading"}
                pressed={state === "pressed"}
                variant={variant}
              >
                {state === "loading" ? busy : label}
              </Button>
              <figcaption>
                <Tag>{state}</Tag>
              </figcaption>
            </figure>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-end gap-3">
        <Button icon={<IconArrowForward size={20} />} size="lg">
          ابدأ رحلتك
        </Button>
        <Button icon={<IconArrowForward size={20} />}>ابدأ الدورة</Button>
        <Button icon={<IconArrowForward size={18} />} size="sm">
          ابدأ الدورة
        </Button>
        <Button icon={<IconSend size={18} />} size="sm" variant="secondary">
          قدّم عبر دليل
        </Button>
        <Button size="sm" variant="ghost">
          اعرض المهارات
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button icon={<IconPlus size={20} />} iconPosition="start" pressed={pressed} variant="secondary">
          أضف هدفاً
        </Button>
        <Button onClick={pressForMe} size="sm" variant="ghost">
          دع دليل يضغط الزر المجاور
        </Button>
        <Tag>sizes: lg 56 · md 48 · sm 40</Tag>
      </div>
    </Cell>
  );
}

function IconButtonsCell() {
  return (
    <Cell note="plain · outline · solid; sm 36 · md 44 · lg 52; every one has an Arabic label. Plain and outline are quiet (no coral dot); solid is the action itself." span={5} title="IconButton">
      <div className="grid grid-cols-[auto_repeat(4,auto)] items-center justify-start gap-x-5 gap-y-3">
        <span />
        <Tag>sm</Tag>
        <Tag>md</Tag>
        <Tag>lg</Tag>
        <Tag>disabled</Tag>
        {(["plain", "outline", "solid"] as const).map((v) => (
          <Row key={v} label={v}>
            <IconButton icon={<IconClose size={18} />} label="إغلاق" size="sm" variant={v} />
            <IconButton icon={<IconSearch size={20} />} label="بحث" tip variant={v} />
            <IconButton icon={<IconSend size={24} />} label="إرسال" size="lg" variant={v} />
            <IconButton disabled icon={<IconSearch size={20} />} label="بحث" variant={v} />
          </Row>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Tooltip content="افتح مساري">
          <Button size="sm" variant="secondary">
            مرّر المؤشر هنا
          </Button>
        </Tooltip>
        <Tag>Tooltip (desktop hover and focus only)</Tag>
      </div>
    </Cell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Tag>{label}</Tag>
      {children}
    </>
  );
}

function ChipsCell() {
  const [city, setCity] = useState("riyadh");
  const [fields, setFields] = useState<string[]>(["data"]);
  const toggle = (id: string) => setFields((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  return (
    <Cell note="selectable quick replies (aria-pressed); selected carries the waypoint dot" span={5} title="Chip · SkillChip">
      <div className="flex flex-wrap gap-2.5">
        {CITIES.map((c) => (
          <Chip key={c.value} onClick={() => setCity(c.value)} selected={city === c.value}>
            {c.label}
          </Chip>
        ))}
        <Chip disabled>مدينة أخرى</Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        {FIELDS.slice(1).map((f) => (
          <Chip key={f.value} onClick={() => toggle(f.value)} selected={fields.includes(f.value)} size="sm">
            {f.label}
          </Chip>
        ))}
        <Chip pressed size="sm">
          مضغوطة
        </Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        <SkillChip state="has">Excel</SkillChip>
        <SkillChip state="has">الإحصاء</SkillChip>
        <SkillChip state="missing">SQL</SkillChip>
        <SkillChip state="missing">Power BI</SkillChip>
        <SkillChip>Python</SkillChip>
      </div>
    </Cell>
  );
}

function CardsCell() {
  return (
    <Cell note="the label sits in the border line, like a contour height; dot muted by default, accent only on the next-step card" span={7} title="Card">
      <div className="grid gap-5 sm:grid-cols-2">
        <Card label="سيرتك الذاتية">
          <h4 className="text-h3">في سيرتك 8 مهارات</h4>
          <p className="mt-1 text-small text-fg-2">كل مهارة معها الجملة التي تثبتها من سيرتك.</p>
          <Button className="mt-3" size="sm" variant="ghost">
            اعرض المهارات
          </Button>
        </Card>
        <Card dot="accent" label="الخطوة التالية">
          <h4 className="text-h3">
            <bdi>SQL</bdi> للمبتدئين
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-small text-fg-2">
            <span>6 ساعات</span>
            <XpValue gain value={200} />
          </div>
          <Button className="mt-4 w-full" icon={<IconArrowForward size={20} />}>
            ابدأ الدورة
          </Button>
        </Card>
        <Card variant="plain">
          <p className="text-title">بطاقة مرسومة بلا تعبئة</p>
          <p className="text-small text-fg-2">
            <bdi dir="ltr">variant=&quot;plain&quot;</bdi> إطار على الصفحة، للمجموعات الهادئة.
          </p>
        </Card>
        <Card dot="accent" label="الخطوة التالية" variant="stage">
          <p className="text-h3">تحليل البيانات بـ Python</p>
          <p className="mt-1 text-small text-fg-2">تُفتح بعد SQL · المحطة 4 من 6</p>
          <div className="mt-3 flex items-center justify-between">
            <XpValue gain value={240} />
            <SkillStars size="sm" value={1} />
          </div>
        </Card>
        <Card interactive label="وظيفة" className="sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-h3">محلل بيانات</h4>
              <p className="text-small text-fg-2">شركة نخلة الرقمية · الرياض</p>
            </div>
            <SampleTag kind="company" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SkillChip state="has">Excel</SkillChip>
            <SkillChip state="missing">SQL</SkillChip>
          </div>
        </Card>
      </div>
    </Cell>
  );
}

function FieldsCell({ surface }: { surface: "paper" | "stage" }) {
  const [name, setName] = useState("سارة");
  const [city, setCity] = useState<string | null>(surface === "paper" ? "riyadh" : null);
  const [field, setField] = useState<string | null>("all");
  return (
    <Cell note="label above, one line of hint or error; focus = ink border + 3 px halo; caret in the accent" span={12} title="TextField · TextArea · SelectField">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <TextField label="اسمك" placeholder="اكتب اسمك الأول" />
        <TextField hint="يظهر في لوحة المتصدرين." label="اسمك" onChange={(e) => setName(e.target.value)} value={name} />
        <TextField error="اكتب اسمك بالحروف العربية أو اللاتينية." label="اسمك" readOnly value="123" />
        <TextField disabled label="البريد" placeholder="غير مطلوب في العرض" />
        <TextField icon={<IconSearch size={20} />} label="ابحث" placeholder="ابحث عن وظيفة أو مهارة" />
        <SelectField icon={<IconLocation size={20} />} items={CITIES} label="المدينة" onValueChange={setCity} placeholder="كل المدن" value={city} />
        <SelectField icon={<IconFilter size={20} />} items={FIELDS} label="المجال" onValueChange={setField} size="sm" value={field} />
        <SelectField disabled items={CITIES} label="المدينة (معطّل)" placeholder="كل المدن" />
        <TextField className="md:col-span-2" label="اسمك (كبير، لصفحة الدخول)" placeholder="اكتب اسمك" size="lg" />
        <TextArea className="md:col-span-2" hint="الصق نص سيرتك الذاتية كما هو." label="سيرتك نصاً" placeholder="خالد العتيبي · خريج إحصاء…" rows={3} />
      </div>
    </Cell>
  );
}

function XpCell() {
  const [total, setTotal] = useState(420);
  const lv = levelOf(total);
  return (
    <Cell note="segments fill in counted steps while the number counts; a level-up finishes the sheet, then starts the next" span={7} title="XpBar · XpValue">
      <XpBar from={lv.from} level={lv.level} nextTitle={lv.nextTitle} showRemaining title={lv.title} to={lv.to} total={total} />
      <div className="max-w-xs">
        <XpBar from={lv.from} level={lv.level} title={lv.title} to={lv.to} total={total} variant="compact" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setTotal((t) => t + 40)} size="sm" variant="secondary">
          <bdi dir="ltr">+40 XP</bdi>
        </Button>
        <Button onClick={() => setTotal((t) => t + 200)} size="sm" variant="secondary">
          <bdi dir="ltr">+200 XP</bdi>
        </Button>
        <Button onClick={() => setTotal(180)} size="sm" variant="ghost">
          ارجع إلى 180
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <XpValue gain size="sm" value={100} />
        <XpValue gain value={200} />
        <XpValue size="lg" value={1240} />
        <span className="inline-flex items-end gap-3 text-xp-fg">
          <XpGlyph size={18} />
          <XpGlyph size={24} />
          <XpGlyph size={40} />
          <Tag>XpGlyph: the spot height, an open hill with its summit dot</Tag>
        </span>
      </div>
    </Cell>
  );
}

function StarsCell() {
  const [replay, setReplay] = useState(0);
  return (
    <Cell note="earned = solid, empty slot = solid outline; 14 px or more; the fresh star lands with a pop" span={5} title="SkillStars">
      <div className="flex flex-wrap items-center gap-6">
        {[0, 1, 2, 3].map((v) => (
          <span className="inline-flex items-center gap-2" key={v}>
            <SkillStars value={v} />
            <Tag>{v}/3</Tag>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <span className="inline-flex items-center gap-2">
          <SkillStars slots={1} value={1} />
          <Tag>1 slot</Tag>
        </span>
        <span className="inline-flex items-center gap-2">
          <SkillStars slots={2} value={1} />
          <Tag>2 slots</Tag>
        </span>
        <SkillStars size="sm" value={2} />
        <SkillStars size="lg" value={2} />
      </div>
      <div className="flex items-center gap-4">
        <SkillStars fresh={2} key={replay} size="lg" value={2} />
        <Button onClick={() => setReplay((r) => r + 1)} size="sm" variant="ghost">
          أعد هبوط النجمة
        </Button>
      </div>
    </Cell>
  );
}

function RingCell() {
  const [match, setMatch] = useState(70);
  const [preview, setPreview] = useState(false);
  return (
    <Cell
      note="Ring from @/components/motion: one open ring ending in the waypoint, never a closed donut. Arc fg, dotted track border-strong, dot accent, Latin tabular digits. On the page background set --ring-cut to bg."
      span={5}
      title="Ring (match)"
    >
      <div className="flex flex-wrap items-center gap-6">
        <Ring className="[--ring-cut:var(--color-bg)]" preview={preview ? Math.min(100, match + 20) : undefined} size={120} value={match} />
        <Ring className="[--ring-cut:var(--color-bg)]" size={56} value={match} />
        <Card className="inline-flex items-center gap-3 p-3" padding="none">
          <Ring size={56} value={45} />
          <span className="text-small text-fg-2">في بطاقة</span>
        </Card>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setMatch((m) => (m >= 90 ? 50 : m + 20))} size="sm" variant="secondary">
          <bdi dir="ltr">+20%</bdi>
        </Button>
        <Button onClick={() => setPreview((p) => !p)} size="sm" variant="ghost">
          معاينة أثر الدورة
        </Button>
        <Tag>sizes 120 · 56</Tag>
      </div>
    </Cell>
  );
}

const LEADERS = [
  { rank: 1, name: "نورة القحطاني", avatar: "av-05", level: 5, xp: 2140 },
  { rank: 2, name: "فيصل الدوسري", avatar: "av-10", level: 5, xp: 1980 },
  { rank: 3, name: "ريم الشهري", avatar: "av-07", level: 4, xp: 1720 },
  { rank: 7, name: "سارة العتيبي", avatar: "av-06", level: 3, xp: 1240, me: true },
] as const;

function LeaderboardCell() {
  return (
    <Cell
      note="recipe DESIGN.md 4.8: rank in tabular digits (ink, never gold), Avatar 40 with its level ring, XP in brass. The «أنت» row is an ink row (data-surface=stage) with «أنت» in the accent."
      span={7}
      title="Leaderboard row"
    >
      <Card padding="none">
        <ol className="flex flex-col gap-1 p-2">
          {LEADERS.slice(0, 3).map((r) => (
            <LeaderRow key={r.rank} {...r} />
          ))}
          <li className="px-3 py-1">
            <Divider label="المراتب 4 إلى 6" variant="trail" />
          </li>
          <LeaderRow {...LEADERS[3]} />
        </ol>
      </Card>
      <p className="flex items-center gap-2 text-small text-fg-3">
        <SampleTag />
        المستخدمون الآخرون هنا للعرض فقط.
      </p>
    </Cell>
  );
}

// The avatars are loaded lazily on the client: while their agent is mid-edit a broken avatar module must not take the
// whole gallery down (the Guard below shows a placeholder instead).
const Avatar = dynamic(() => import("@/components/avatars").then((m) => m.Avatar), {
  ssr: false,
  loading: () => <span className="size-10 shrink-0 rounded-full border-2 border-dashed border-fg-4" />,
});

/** Other agents' pieces are still landing while the kit is open: one failing piece shows a placeholder, not a broken page. */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    // Suspense too: on the server an error falls back to the nearest Suspense boundary (error boundaries run on the client)
    return this.state.failed ? this.props.fallback : <Suspense fallback={this.props.fallback}>{this.props.children}</Suspense>;
  }
}

function LeaderRow({ rank, name, avatar, level, xp, me = false }: { rank: number; name: string; avatar: string; level: number; xp: number; me?: boolean }) {
  return (
    <li className={cn("flex h-14 items-center gap-3 rounded-control px-3", me && "bg-bg")} data-surface={me ? "stage" : undefined}>
      <span className="w-7 shrink-0 text-center text-title font-bold text-fg-3 tabular-nums" dir="ltr">
        {rank}
      </span>
      <Guard fallback={<span className="size-10 shrink-0 rounded-full border-2 border-dashed border-fg-4" />}>
        <Avatar id={avatar} level={level} size={40} />
      </Guard>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-body font-medium text-fg">{name}</span>
        {me ? <span className="shrink-0 text-small font-semibold text-accent-fg">أنت</span> : null}
      </span>
      <XpValue size="sm" value={xp} />
    </li>
  );
}

function RewardsCell() {
  const [stampKey, setStampKey] = useState(0);
  const [badgeKey, setBadgeKey] = useState(0);
  const [days, setDays] = useState(4);
  return (
    <Cell note="Stamp («تمّ», lands with one press frame) · BadgeMedal earned / locked / just unlocked · StreakFlame · StreakWeek" span={12} title="Stamp · BadgeMedal · Streak">
      <div className="grid items-start gap-x-10 gap-y-10 lg:grid-cols-[auto_auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-end justify-center gap-4">
            <Stamp size="sm" />
            <Stamp />
            <Stamp delay={0.6} key={stampKey} play={stampKey > 0} size="lg" />
            <Stamp size="md" tone="ink" label="أُرسل" />
          </div>
          <Button onClick={() => setStampKey((k) => k + 1)} size="sm" variant="ghost">
            اختم من جديد
          </Button>
        </div>
        <Divider className="hidden lg:block" orientation="vertical" />
        <div className="flex flex-col items-center gap-3">
          {/* the real emblems, passed with no size: BadgeMedal sizes whatever it is given to its emblem box */}
          <div className="flex flex-wrap items-start justify-center gap-5">
            <BadgeMedal description="أكملت التعارف مع دليل." emblem={<BadgeEmblem id="first-steps" />} name="الخطوة الأولى" />
            <BadgeMedal description="عدت ثلاثة أيام متتالية." emblem={<BadgeEmblem id="streak-3" />} name="ثلاثة أيام" />
            <BadgeMedal
              emblem={<BadgeEmblem id="job-ready" />}
              hint="ابلغ 100% مع وظيفتك المستهدفة."
              lockedEmblem={<BadgeEmblem id="job-ready" locked />}
              name="جاهز للوظيفة"
              state="locked"
            />
            <BadgeMedal
              description="أكملت أول دورة."
              emblem={<BadgeEmblem id="first-course" />}
              key={badgeKey}
              lockedEmblem={<BadgeEmblem id="first-course" locked />}
              name="أول دورة"
              size="md"
              state={badgeKey > 0 ? "new" : "earned"}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <BadgeMedal bare emblem={<BadgeEmblem id="cv-scanned" />} size="sm" />
            <BadgeMedal bare emblem={<BadgeEmblem id="top-ten" />} lockedEmblem={<BadgeEmblem id="top-ten" locked />} size="sm" state="locked" />
            <BadgeMedal bare emblem={<LevelEmblem level={3} />} size="lg" />
            <Button onClick={() => setBadgeKey((k) => k + 1)} size="sm" variant="ghost">
              افتح الشارة أمامي
            </Button>
          </div>
          <Tag>sm 56 · md 80 · lg 112 (lg: LevelEmblem 3)</Tag>
        </div>
        <div className="flex flex-wrap items-start gap-x-12 gap-y-6 lg:col-span-3">
          <StreakFlame days={days} />
          <StreakWeek days={WEEK} />
          <StreakWeek days={WEEK_BROKEN} />
          <div className="flex items-center gap-3">
            <StreakFlame days={days} size="sm" />
            <Button onClick={() => setDays((d) => d + 1)} size="sm" variant="ghost">
              يوم آخر
            </Button>
          </div>
        </div>
      </div>
    </Cell>
  );
}

function QuietCell() {
  return (
    <Cell note="EmptyState (drawn, one action) · ContourBackdrop faint / quiet / present · Divider · Kbd · SampleTag" span={12} title="Quiet pieces">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
        <Card padding="none">
          <EmptyState
            action={
              <Button icon={<IconArrowForward size={20} />} variant="secondary">
                تصفّح الوظائف
              </Button>
            }
            body="لم تقدّم على أي وظيفة بعد. اختر وظيفة وسيقدّم عنك دليل إن طلبت."
            title="لا طلبات بعد"
          />
        </Card>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            {(["faint", "quiet", "present"] as const).map((i) => (
              <div className="relative isolate h-32 overflow-hidden rounded-card border border-border" key={i}>
                <ContourBackdrop intensity={i} />
                <span className="absolute bottom-2 start-3">
                  <Tag>{i}</Tag>
                </span>
              </div>
            ))}
          </div>
          <Divider />
          <Divider variant="trail" />
          <Divider label="المراتب 4 و5" variant="trail" />
          <div className="flex flex-wrap items-center gap-4 text-small text-fg-2">
            <span className="inline-flex items-center gap-1.5">
              اسأل دليل <Kbd keys={["Ctrl", "K"]} />
            </span>
            <span className="inline-flex items-center gap-1.5">
              أغلق <Kbd>Esc</Kbd>
            </span>
            <SampleTag />
            <SampleTag kind="company" />
            <SampleTag kind="cv" />
          </div>
        </div>
      </div>
    </Cell>
  );
}

function ToastsCell() {
  return (
    <Cell note="one position: top centre under the top bar; newest on top, three at most; XP 3.5 s, badge 5 s" span={12} title="Toaster · toast()">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => toast.xp({ amount: 100, reason: "حلّلت سيرتك", rank: 18 })} size="sm" variant="secondary">
          toast.xp مع الترتيب
        </Button>
        <Button onClick={() => toast.xp({ amount: 40, reason: "تقديم مدروس" })} size="sm" variant="secondary">
          toast.xp
        </Button>
        <Button
          onClick={() =>
            toast.badge({ badgeId: "cv-scanned", name: "سيرة مقروءة", description: "حلّلت سيرتك واكتشفت مهاراتك.", emblem: <BadgeEmblem id="cv-scanned" /> })
          }
          size="sm"
          variant="secondary"
        >
          toast.badge
        </Button>
        <Button onClick={() => toast({ title: "حُفظت صورتك الرمزية", tone: "ok" })} size="sm" variant="secondary">
          toast (ok)
        </Button>
        <Button onClick={() => toast({ title: "تعذّر قراءة الملف", description: "جرّب ملف PDF أو Word، أو الصق النص.", tone: "warn" })} size="sm" variant="secondary">
          toast (warn)
        </Button>
      </div>
    </Cell>
  );
}

function Kit({ surface }: { surface: "paper" | "stage" }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
      <ButtonsCell />
      <IconButtonsCell />
      <CardsCell />
      <ChipsCell />
      <FieldsCell surface={surface} />
      <XpCell />
      <StarsCell />
      <RingCell />
      <LeaderboardCell />
      <RewardsCell />
      <QuietCell />
      {surface === "paper" ? <ToastsCell /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

export default function KitPage() {
  return (
    <main className="mx-auto flex max-w-[90rem] flex-col gap-section px-gutter py-10">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-fg-3" dir="ltr">
          /dev/kit · design system · Dalilak
        </p>
        <h1 className="text-h1">عُدّة دليلك</h1>
        <p className="max-w-2xl text-body text-fg-2">
          الألوان والخطوط وكل قطعة تُبنى منها الشاشات، على الورق أولاً ثم على المسرح الداكن. كل لون من رمز، وكل نص يجتاز حدّ التباين.
        </p>
      </header>

      <section className="flex flex-col gap-5" id="tokens">
        <h2 className="text-h2">الألوان</h2>
        <Tokens />
      </section>

      <section className="flex flex-col gap-3" id="type">
        <h2 className="text-h2">الخط: IBM Plex Sans Arabic</h2>
        <Card>
          <TypeScale />
        </Card>
      </section>

      <section className="flex flex-col gap-4" id="aliases">
        <h2 className="text-h2">الأسماء الدلالية: تنقلب على المسرح</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card label="data-surface=paper">
            <AliasColumn />
          </Card>
          <Stage className="rounded-card p-card">
            <p className="mb-3 text-caption text-fg-3" dir="ltr">
              data-surface=stage
            </p>
            <AliasColumn />
          </Stage>
        </div>
      </section>

      <section className="flex flex-col gap-6" id="kit-paper">
        <h2 className="text-h2">القطع على الورق</h2>
        <Kit surface="paper" />
      </section>

      <section className="flex flex-col gap-6" id="kit-stage">
        <h2 className="text-h2">القطع نفسها على المسرح</h2>
        <Stage className="rounded-sheet px-gutter py-10" contour="faint">
          <Kit surface="stage" />
        </Stage>
      </section>

      <section className="flex flex-col gap-4" id="contour-signin">
        <h2 className="text-h2">التضاريس بمقاس صفحة الدخول</h2>
        <p className="text-small text-fg-3">
          <bdi dir="ltr">{'<Stage contour="present">'}</bdi> بارتفاع 720، كما يقف خلف عرض صفحة الدخول.
        </p>
        <Stage className="flex h-[45rem] flex-col justify-end gap-3 rounded-sheet px-gutter py-12 lg:px-14" contour="present" contourSummit={{ x: 0.62, y: 0.38 }}>
          <p className="text-small font-semibold text-accent-fg">دليلك</p>
          <p className="max-w-2xl text-h1 lg:text-display">كل خطوة تقرّبك من وظيفتك</p>
          <p className="max-w-xl text-body text-fg-2">ارفع سيرتك، وسيرسم لك دليل الطريق من حيث تقف اليوم إلى وظيفتك.</p>
        </Stage>
      </section>
    </main>
  );
}
