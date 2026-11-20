import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Avatar, AVATARS, type AvatarId } from "@/components/avatars";
import { AvatarFrame } from "@/components/avatars/avatar";
import { IconAdvisor, IconXp } from "@/components/icons";

// Gallery of Dalilak's avatars (development only). Everything is shown twice: on paper, and inside a stage block.

export const metadata: Metadata = { title: "دليلك · الصور الرمزية" };

const SIZES = [96, 48, 32, 24] as const;
const RING_LEVELS = [1, 3, 5, 7] as const;
const GROUPS = [
  { kind: "n", title: "محايدة", note: "كل حساب جديد يأخذ واحدة منها" },
  { kind: "f", title: "نساء", note: "أربعة أنماط، منها واحدة بلا حجاب" },
  { kind: "m", title: "رجال", note: "شماغ، غترة بعقال، ورأسان مكشوفان" },
] as const;
const TIERS = [
  { level: 2, text: "المستويات 1 إلى 4: لون الحبر" },
  { level: 5, text: "5 و 6: برونزي" },
  { level: 7, text: "7: ذهبي" },
] as const;

function Section({ title, note, children }: { readonly title: string; readonly note?: string; readonly children: ReactNode }) {
  return (
    <section className="grid gap-5">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-xl font-bold text-fg">{title}</h2>
        {note ? <p className="text-sm text-fg-2">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

function SizeTag({ children }: { readonly children: ReactNode }) {
  return (
    <span className="w-14 shrink-0 text-sm font-medium text-fg-3" dir="ltr">
      {children}
    </span>
  );
}

function Cast() {
  return (
    <div className="grid gap-8">
      {GROUPS.map((g) => (
        <div className="grid gap-3" key={g.kind}>
          <p className="text-base font-semibold text-fg">
            {g.title} <span className="font-normal text-fg-2">· {g.note}</span>
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {AVATARS.filter((a) => a.kind === g.kind).map((a) => (
              <figure className="grid justify-items-center gap-3 rounded-2xl border border-border bg-surface px-4 pb-4 pt-5" key={a.id}>
                <Avatar id={a.id} size={96} title={a.label} />
                <div className="flex items-center gap-3">
                  <Avatar id={a.id} size={48} />
                  <Avatar id={a.id} size={32} />
                  <Avatar id={a.id} size={24} />
                </div>
                <figcaption className="grid justify-items-center gap-0.5 text-center">
                  <span className="text-[15px] font-medium leading-6 text-fg">{a.label}</span>
                  <span className="text-[13px] text-fg-3" dir="ltr">
                    {a.id}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Study() {
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-surface p-4 md:p-5">
      {[false, true].map((outline) => (
        <div className="grid gap-3" data-row={outline ? "study-outline" : "study-plain"} key={String(outline)}>
          <p className="text-sm font-medium text-fg-2">{outline ? "الأثر وخط محيط بالحبر: المعتمد" : "الأثر وحده: للمقارنة"}</p>
          <div className="flex flex-wrap items-center gap-3">
            {AVATARS.map((a) => (
              <AvatarFrame id={a.id} key={a.id} outline={outline} size={96} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {AVATARS.map((a) => (
              <AvatarFrame id={a.id} key={a.id} outline={outline} size={32} />
            ))}
            <span className="w-4" />
            {AVATARS.map((a) => (
              <AvatarFrame id={a.id} key={a.id} outline={outline} size={24} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Ladder({ ring }: { readonly ring: boolean }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-surface p-4 md:p-5">
      {SIZES.map((size) => (
        <div className="flex items-center gap-4" data-row={`${ring ? "ring" : "plain"}-${size}`} key={size}>
          <SizeTag>{size} px</SizeTag>
          <div className="flex min-w-0 flex-1 flex-wrap items-center" style={{ gap: Math.max(8, size * 0.22) }}>
            {AVATARS.map((a, i) => (
              <Avatar id={a.id} key={a.id} level={ring ? RING_LEVELS[i % RING_LEVELS.length] : undefined} size={size} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RingLadder() {
  return (
    <div className="grid gap-5 rounded-2xl border border-border bg-surface p-5">
      {SIZES.map((size) => (
        <div className="flex items-center gap-4" data-row={`levels-${size}`} key={size}>
          <SizeTag>{size} px</SizeTag>
          <div className="flex min-w-0 flex-1 flex-wrap items-end" style={{ gap: Math.max(10, size * 0.3) }}>
            {[1, 2, 3, 4, 5, 6, 7].map((level) => (
              <div className="grid justify-items-center gap-1.5" key={level}>
                <Avatar id="av-01" level={level} size={size} />
                {size >= 48 ? <span className="text-[13px] text-fg-2">المستوى {level}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
        {TIERS.map((t) => (
          <span className="flex items-center gap-2 text-sm text-fg-2" key={t.level}>
            <Avatar id="av-05" level={t.level} size={32} />
            {t.text}
          </span>
        ))}
      </div>
    </div>
  );
}

const PODIUM: readonly { rank: number; name: string; id: AvatarId; level: number; xp: number; h: string }[] = [
  { rank: 2, name: "سلطان م.", id: "av-10", level: 6, xp: 910, h: "h-16" },
  { rank: 1, name: "فيصل ق.", id: "av-09", level: 7, xp: 980, h: "h-24" },
  { rank: 3, name: "مشعل ر.", id: "av-11", level: 5, xp: 860, h: "h-10" },
];

const ROWS: readonly { rank: number; name: string; city: string; id: AvatarId; level: number; xp: number; me?: boolean }[] = [
  { rank: 9, name: "ريم ح.", city: "الدمام", id: "av-06", level: 6, xp: 440 },
  { rank: 10, name: "خالد", city: "الرياض", id: "av-01", level: 3, xp: 420, me: true },
  { rank: 11, name: "جود ز.", city: "جدة", id: "av-07", level: 5, xp: 340 },
];

function Xp({ value }: { readonly value: number }) {
  return (
    <span className="flex items-center gap-1 font-semibold text-xp-fg" dir="ltr">
      <IconXp size={16} />
      {value} XP
    </span>
  );
}

function Leaderboard() {
  return (
    <div className="grid gap-5 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-fg">المتصدرون هذا الأسبوع</p>
        <span className="rounded-md border border-dashed border-border-strong px-2 text-[13px] text-fg-2">بيانات تجريبية</span>
      </div>
      <div className="grid grid-cols-3 items-end gap-3">
        {PODIUM.map((p) => (
          <div className="grid justify-items-center gap-2" key={p.rank}>
            <Avatar id={p.id} level={p.level} size={p.rank === 1 ? 72 : 60} />
            <span className="text-[15px] font-semibold text-fg">{p.name}</span>
            <Xp value={p.xp} />
            <div className={`grid w-full place-items-center rounded-t-xl border border-b-0 border-border bg-bg ${p.h}`}>
              <span className="text-xl font-bold text-fg">{p.rank}</span>
            </div>
          </div>
        ))}
      </div>
      <ol className="grid gap-2">
        {ROWS.map((r) => (
          <li
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.me ? "bg-bg ring-1 ring-border-strong" : ""}`}
            key={r.rank}
          >
            <span className="w-6 text-center text-base font-bold text-fg-2">{r.rank}</span>
            <Avatar id={r.id} level={r.level} size={40} />
            <span className="grid min-w-0 flex-1 leading-6">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                {r.name}
                {r.me ? <span className="rounded-full bg-accent px-2 text-[13px] font-semibold text-on-accent">أنت</span> : null}
              </span>
              <span className="text-[13px] text-fg-2">
                {r.city} · المستوى {r.level}
              </span>
            </span>
            <Xp value={r.xp} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChatSample() {
  return (
    <div className="grid content-start gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="grid size-10 place-items-center rounded-full bg-stage text-on-stage">
            <IconAdvisor size={22} />
          </span>
          <span className="grid flex-1 leading-6">
            <span className="text-base font-bold text-fg">دليل</span>
            <span className="text-[13px] text-fg-2">مستشارك المهني</span>
          </span>
          <Avatar id="av-01" level={3} size={36} title="صورتك" />
        </div>
        <div className="grid gap-3 px-4 py-4">
          <div className="flex items-end gap-2">
            <Avatar id="av-01" size={32} />
            <p className="rounded-2xl rounded-ee-md bg-bg px-4 py-2 text-[15px] text-fg">وش أتعلّم بعد SQL؟</p>
          </div>
          <div className="flex items-end justify-end gap-2">
            <p className="max-w-[80%] rounded-2xl rounded-es-md border border-border px-4 py-2 text-[15px] text-fg">
              الخطوة التالية في مسارك: لوحات Power BI. أفتحها لك؟
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <Avatar id="av-01" level={3} size={44} />
        <span className="grid leading-6">
          <span className="text-[15px] font-semibold text-fg">خالد</span>
          <span className="text-[13px] text-fg-2">المستوى 3 · مجتهد</span>
        </span>
        <span className="ms-auto">
          <Xp value={420} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <span className="text-[13px] text-fg-2">في سطر واحد:</span>
        {AVATARS.map((a) => (
          <Avatar id={a.id} key={a.id} size={24} />
        ))}
      </div>
    </div>
  );
}

function Board() {
  return (
    <div className="grid gap-12">
      <Section note="96 ثم 48 و 32 و 24 بكسل" title="الطاقم">
        <Cast />
      </Section>
      <Section note="صف 32 هو الاختبار: يجب أن يُعرف كل وجه من شكله لا من لونه فقط" title="المقاسات بلا حلقة">
        <Ladder ring={false} />
      </Section>
      <Section note="سبع قطع تبدأ من الساعة 12 مع عقارب الساعة، والمضاء منها بعدد المستوى: خط متصل، والباقي منقّط. لا رقم تحتها" title="حلقة المستوى">
        <Ladder ring />
        <RingLadder />
      </Section>
      <Section title="في الاستخدام">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Leaderboard />
          <ChatSample />
        </div>
      </Section>
    </div>
  );
}

export default function AvatarsGallery() {
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-10 md:px-10">
        <header className="grid gap-2">
          <h1 className="text-3xl font-bold">الصور الرمزية</h1>
          <p className="max-w-3xl text-base text-ink-2">
            اثنا عشر شخصًا مرسومين باليد بلغة الخريطة: خلف كل شخص أثر الطريق، متصل حتى يصل إليه ومنقّط بعده، فالشخص واقف حيث «أنت هنا».
            ثنيات القماش خطوط كنتور، ونقش الشماغ أثر متقطع، ونقطة الطريق دبوس واحد على الصدر في المكان نفسه عند الجميع.
          </p>
        </header>
        <section className="grid gap-4" data-gallery="detail">
          <h2 className="text-xl font-bold text-fg">عن قرب</h2>
          <div className="hidden flex-wrap justify-center gap-6 rounded-2xl border border-border bg-surface p-6 md:flex">
            {AVATARS.map((a) => (
              <Avatar id={a.id} key={a.id} size={156} />
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4 rounded-2xl border border-border bg-surface p-4 md:hidden">
            {AVATARS.map((a) => (
              <Avatar id={a.id} key={a.id} size={140} />
            ))}
          </div>
        </section>
        <section className="grid gap-4" data-gallery="study">
          <h2 className="text-xl font-bold text-fg">دراسة: هل يُرسم خط محيط؟</h2>
          <p className="max-w-3xl text-sm text-fg-2">الخط المحيط يفصل أغطية الرأس الفاتحة عن الأرضية الفاتحة في 24 و 32 بكسل، ويربط الصور بخط الأيقونات.</p>
          <Study />
        </section>
        <div className="rounded-3xl p-1" data-gallery="paper">
          <Board />
        </div>
        <div className="rounded-3xl px-5 py-10 md:px-10" data-gallery="stage" data-surface="stage">
          <p className="mb-8 text-sm text-fg-2">على المسرح (data-surface=&quot;stage&quot;)</p>
          <Board />
        </div>
      </div>
    </main>
  );
}
