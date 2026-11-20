"use client";

// /dev/brand: the Dalilak «دليل» logo system (development gallery; Latin labels are for the team, not the product).
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  AppIcon,
  APP_TILE,
  FAVICON_16,
  FAVICON_32,
  Logo,
  LogoFavicon,
  LOCKUP,
  lockupGeometry,
  LogoMark,
  MARK_16,
  MARK_24,
  MARK_32,
  MARK_FULL,
  type MarkCut,
  MarkShape,
  pickCut,
  Wordmark,
  WORDMARK,
  WORDMARK_ACCENT_FROM,
  WordShape,
} from "@/components/brand";
import { IconAdvisor, IconBadge, IconPath, IconSkills, IconStreak, IconXp } from "@/components/icons";

type Surface = "paper" | "stage";

function Board({ surface = "paper", label, children, className = "", sheet = false }: { readonly surface?: Surface; readonly label: string; readonly children: ReactNode; readonly className?: string; readonly sheet?: boolean }) {
  const stage = surface === "stage";
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${stage ? "bg-stage text-on-stage" : sheet ? "border border-line bg-sheet text-ink" : "bg-paper text-ink"} ${className}`}
      data-surface={stage ? "stage" : "paper"}
    >
      <span className={`absolute start-5 top-4 z-10 text-[13px] font-medium ${stage ? "text-on-stage-3" : "text-ink-3"}`} dir="ltr">
        {label}
      </span>
      {children}
    </div>
  );
}

function Section({ n, title, note, children }: { readonly n: string; readonly title: string; readonly note?: string; readonly children: ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-5 flex items-baseline gap-4" dir="ltr">
        <span className="text-[13px] font-semibold text-ink-3">{n}</span>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {note ? <p className="text-[14px] text-ink-3">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Quiet contour hairlines (map texture) for the hero boards. */
function Contours({ surface, cx = 72, cy = 30 }: { readonly surface: Surface; readonly cx?: number; readonly cy?: number }) {
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full" fill="none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 70">
      <g strokeWidth={0.18} style={{ stroke: surface === "stage" ? "var(--color-stage-contour)" : "var(--color-contour)" }}>
        {[9, 16, 23, 30, 37, 44, 51, 58].map((r, i) => (
          <ellipse cx={cx + i * 0.6} cy={cy + i * 0.9} key={r} rx={r * 1.08} ry={r * 0.86} transform={`rotate(${-8 + i} ${cx} ${cy})`} />
        ))}
      </g>
    </svg>
  );
}

/** Draws an image source at its real pixel size on a background, then shows it enlarged with hard pixels. */
function useZoomCanvas(src: string | null, px: number, zoom: number, bgVar: string) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!src) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue(bgVar).trim();
    const img = new Image();
    img.onload = () => {
      const small = document.createElement("canvas");
      small.width = px;
      small.height = px;
      const g = small.getContext("2d");
      const big = ref.current;
      if (!g || !big) return;
      g.fillStyle = bg;
      g.fillRect(0, 0, px, px);
      g.drawImage(img, 0, 0, px, px);
      const bg2 = big.getContext("2d");
      if (!bg2) return;
      bg2.imageSmoothingEnabled = false;
      bg2.drawImage(small, 0, 0, px * zoom, px * zoom);
    };
    img.src = src;
  }, [src, px, zoom, bgVar]);
  return ref;
}

/** Rasterises a cut at its real pixel size, then shows it enlarged with hard pixels (what a screen really draws). */
function PixelZoom({ cut, px, zoom, surface }: { readonly cut: MarkCut; readonly px: number; readonly zoom: number; readonly surface: Surface }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const ink = surface === "stage" ? v("--color-on-stage") : v("--color-ink");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${cut.vb} ${cut.vb}"><path d="${cut.d}" fill="none" stroke="${ink}" stroke-width="${cut.sw}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${cut.dot.cx}" cy="${cut.dot.cy}" r="${cut.dot.r}" fill="${v("--color-accent")}"/></svg>`;
    setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  }, [cut, px, surface]);
  const ref = useZoomCanvas(src, px, zoom, surface === "stage" ? "--color-stage" : "--color-paper");
  return <canvas className="rounded-md" height={px * zoom} ref={ref} style={{ imageRendering: "pixelated" }} width={px * zoom} />;
}

/** The real favicon file (/icon.svg) rasterised at a tab's pixel size on a background token, enlarged with hard pixels. */
function FileZoom({ px, zoom, bgVar }: { readonly px: number; readonly zoom: number; readonly bgVar: string }) {
  const ref = useZoomCanvas("/icon.svg", px, zoom, bgVar);
  return <canvas className="rounded-md" height={px * zoom} ref={ref} style={{ imageRendering: "pixelated" }} width={px * zoom} />;
}

/** The ي's dots, enlarged: the two drawn circles, with the font's own dot shapes as dashed outlines (same width and spacing). */
const FONT_DOT = "M153 21.5Q150.4 21.5 148.75 19.9Q147.1 18.3 147.1 14.8Q147.1 11.3 148.75 9.7Q150.4 8.1 153 8.1L155 8.1Q157.6 8.1 159.25 9.7Q160.9 11.3 160.9 14.8Q160.9 18.3 159.25 19.9Q157.6 21.5 155 21.5L153 21.5Z";
/** FONT_DOT was taken where the ink dot sat in the first wordmark (cx 154); this follows the dot wherever the word puts it. */
const FONT_DOT_DX = WORDMARK.inkDot.cx - 154;
function DotsProof() {
  return (
    <svg className="h-auto w-full" viewBox={`${112 + FONT_DOT_DX} -48 72 74`}>
      <WordShape tone="accent" />
      <g fill="none" strokeDasharray="0.8 0.6" strokeWidth={0.35} style={{ stroke: "var(--color-ok)" }} transform={`translate(${FONT_DOT_DX} 0)`}>
        <path d={FONT_DOT} />
        <path d={FONT_DOT} transform={`translate(${WORDMARK.dot.cx - WORDMARK.inkDot.cx} 0)`} />
      </g>
    </svg>
  );
}

function Caption({ children, surface = "paper" }: { readonly children: ReactNode; readonly surface?: Surface }) {
  return (
    <span className={`whitespace-nowrap text-[13px] ${surface === "stage" ? "text-on-stage-2" : "text-ink-3"}`} dir="ltr">
      {children}
    </span>
  );
}

/** The 64-grid construction drawing of the full mark. */
function Construction() {
  const k = MARK_FULL;
  const grid = Array.from({ length: 17 }, (_, i) => i * 4);
  const label = { fontSize: 2.1, fontFamily: "var(--font-sans)" } as const;
  return (
    <svg className="h-auto w-full" fill="none" viewBox="-21 -2 112 70">
      <g strokeWidth={0.08} style={{ stroke: "var(--color-line)" }}>
        {grid.map((g) => (
          <g key={g}>
            <line x1={g} x2={g} y1={0} y2={64} style={g % 16 === 0 ? { stroke: "var(--color-line-strong)" } : undefined} />
            <line x1={0} x2={64} y1={g} y2={g} style={g % 16 === 0 ? { stroke: "var(--color-line-strong)" } : undefined} />
          </g>
        ))}
      </g>
      {/* ink box and clear centre */}
      <rect height={k.ink.y1 - k.ink.y0} strokeDasharray="0.6 0.6" strokeWidth={0.12} style={{ stroke: "var(--color-contour-ink)" }} width={k.ink.x1 - k.ink.x0} x={k.ink.x0} y={k.ink.y0} />
      <g style={{ color: "var(--color-ink)" }}>
        <MarkShape cut={k} />
      </g>
      {/* the trail's centre line: one path, start to end */}
      <path d={k.d} strokeDasharray="0.9 0.7" strokeWidth={0.22} style={{ stroke: "var(--color-sheet)" }} />
      <circle cx={56} cy={50} r={0.7} style={{ fill: "var(--color-sheet)" }} />
      <circle cx={44} cy={50} r={0.7} style={{ fill: "var(--color-sheet)" }} />
      {/* arch centres and radii */}
      <g strokeWidth={0.16} style={{ stroke: "var(--color-accent-ink)" }}>
        <line x1={32} x2={32} y1={6} y2={58} strokeDasharray="0.5 0.5" />
        <line x1={32} x2={56} y1={38} y2={38} />
        <line x1={32} x2={43.5} y1={38.6} y2={38.6} />
      </g>
      <circle cx={32} cy={38} r={0.55} style={{ fill: "var(--color-accent-ink)" }} />
      {/* centroid */}
      <g strokeWidth={0.18} style={{ stroke: "var(--color-ok)" }}>
        <circle cx={k.centroid.x} cy={k.centroid.y} r={1.1} />
        <line x1={k.centroid.x - 2} x2={k.centroid.x + 2} y1={k.centroid.y} y2={k.centroid.y} />
        <line x1={k.centroid.x} x2={k.centroid.x} y1={k.centroid.y - 2} y2={k.centroid.y + 2} />
      </g>
      {/* annotations (outside the grid) */}
      <g style={{ ...label, fill: "var(--color-ink-2)" }}>
        <text x={66} y={9}>64 grid</text>
        <text x={66} y={14}>stroke 7, round</text>
        <text x={66} y={19}>outer arch r 24</text>
        <text x={66} y={24}>inner arch r 11.5</text>
        <text x={66} y={29}>gap 5.5 · window 16</text>
        <text x={66} y={34}>waypoint r 4.75</text>
        <text style={{ fill: "var(--color-ok)" }} x={66} y={41}>centre of mass</text>
        <text x={66} y={46}>(31.7, 32.8)</text>
        <text style={{ fill: "var(--color-contour-ink)" }} x={66} y={53}>ink box</text>
        <text x={66} y={58}>55 x 43</text>
      </g>
      <g style={{ ...label, fill: "var(--color-ink-3)" }} textAnchor="end">
        <text x={-1.5} y={11}>top 10.5</text>
        <text x={-1.5} y={39}>arch centre 38</text>
        <text x={-1.5} y={54}>feet 53.5</text>
      </g>
    </svg>
  );
}

/** A lockup drawn with its clear space (dashed outer box), ink box and baseline. */
function LockupConstruction({ layout, surface }: { readonly layout: "horizontal" | "stacked"; readonly surface: Surface }) {
  const g = lockupGeometry(layout, MARK_FULL);
  const c = g.clear;
  const vb = { x: g.viewBox.x - c - 4, y: g.viewBox.y - c - 4, w: g.viewBox.w + 2 * c + 8, h: g.viewBox.h + 2 * c + 8 };
  const guide = surface === "stage" ? "var(--color-stage-contour-2)" : "var(--color-contour-2)";
  return (
    <svg className="h-auto w-full" fill="none" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
      <rect height={g.viewBox.h + 2 * c} strokeDasharray="2 2" strokeWidth={0.5} style={{ stroke: guide }} width={g.viewBox.w + 2 * c} x={g.viewBox.x - c} y={g.viewBox.y - c} />
      <rect height={g.viewBox.h} strokeWidth={0.4} style={{ stroke: guide }} width={g.viewBox.w} x={g.viewBox.x} y={g.viewBox.y} />
      {layout === "horizontal" ? (
        <>
          <line strokeWidth={0.5} style={{ stroke: "var(--color-accent)" }} x1={g.viewBox.x - c} x2={g.viewBox.x + g.viewBox.w + c} y1={0} y2={0} />
          <line strokeDasharray="1 1.5" strokeWidth={0.4} style={{ stroke: guide }} x1={g.viewBox.x - c} x2={g.viewBox.x + g.viewBox.w + c} y1={WORDMARK.ascender} y2={WORDMARK.ascender} />
        </>
      ) : null}
      {/* clear-space unit: half the mark's height, drawn as a square in the corner */}
      <rect height={c} style={{ fill: guide, opacity: 0.35 }} width={c} x={g.viewBox.x - c} y={g.viewBox.y - c} />
      <WordShape tone="mono" />
      <g transform={`translate(${g.mark.tx} ${g.mark.ty}) scale(${g.mark.s})`}>
        <MarkShape cut={MARK_FULL} />
      </g>
    </svg>
  );
}

/** Proof that the outlines are the font: live IBM Plex Sans Arabic text (accent) under the outlines (ink). */
function WordProof() {
  const vb = `${WORDMARK.ink.x0 - 2} ${WORDMARK.ink.y0 - 2} ${WORDMARK.ink.x1 - WORDMARK.ink.x0 + 4} ${WORDMARK.ink.y1 - WORDMARK.ink.y0 + 4}`;
  return (
    <svg className="h-auto w-full" viewBox={vb}>
      <text fontSize={100} fontWeight={700} style={{ fill: "var(--color-accent)", fontFamily: "var(--font-sans)" }} textAnchor="middle" x={WORDMARK.advance / 2} y={0}>
        دليل
      </text>
      <g style={{ fill: "var(--color-ink)" }}>
        <path d={WORDMARK.body} />
        <circle cx={WORDMARK.dot.cx} cy={WORDMARK.dot.cy} r={WORDMARK.dot.r} />
        <circle cx={WORDMARK.inkDot.cx} cy={WORDMARK.inkDot.cy} r={WORDMARK.inkDot.r} />
      </g>
      <line strokeWidth={0.3} style={{ stroke: "var(--color-ok)" }} x1={0} x2={WORDMARK.advance} y1={0} y2={0} />
    </svg>
  );
}

const SIZES = [64, 32, 28, 24, 20, 16];

/** The static files in public/brand, rendered from the components (the export script reads them from this page). */
const EXPORTS: { name: string; surface: Surface; node: ReactNode }[] = [
  { name: "mark", surface: "paper", node: <LogoMark size={128} title="دليل" /> },
  { name: "mark-on-stage", surface: "stage", node: <LogoMark size={128} title="دليل" /> },
  { name: "mark-mono", surface: "paper", node: <LogoMark size={128} title="دليل" tone="mono" /> },
  { name: "mark-32", surface: "paper", node: <LogoFavicon cut={32} size={64} title="دليل" /> },
  { name: "mark-24", surface: "paper", node: <LogoMark cut="24" size={48} title="دليل" /> },
  { name: "mark-16", surface: "paper", node: <LogoFavicon cut={16} size={64} title="دليل" /> },
  { name: "wordmark", surface: "paper", node: <Wordmark height={72} /> },
  { name: "wordmark-on-stage", surface: "stage", node: <Wordmark height={72} /> },
  { name: "logo-horizontal", surface: "paper", node: <Logo size={64} /> },
  { name: "logo-horizontal-on-stage", surface: "stage", node: <Logo size={64} /> },
  { name: "logo-stacked", surface: "paper", node: <Logo layout="stacked" size={128} /> },
  { name: "logo-stacked-on-stage", surface: "stage", node: <Logo layout="stacked" size={128} /> },
  { name: "app-icon", surface: "paper", node: <AppIcon size={128} title="دليل" /> },
  { name: "app-icon-48", surface: "paper", node: <AppIcon size={48} title="دليل" /> },
  { name: "app-icon-32", surface: "paper", node: <AppIcon size={32} title="دليل" /> },
  { name: "favicon-16", surface: "paper", node: <LogoFavicon cut={16} size={16} tile title="دليل" /> },
  { name: "favicon-32", surface: "paper", node: <LogoFavicon cut={32} size={32} tile title="دليل" /> },
];

export default function BrandGallery() {
  return (
    <main className="mx-auto max-w-[1360px] px-4 py-8 md:px-10 md:py-12" dir="ltr">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="text-[13px] font-semibold text-ink-3">Dalilak · brand system · /dev/brand</p>
          <h1 className="mt-1 text-3xl font-bold">The mark, the wordmark «دليل», lockups, small cuts, app tile</h1>
          <p className="mt-2 max-w-3xl text-[15px] text-ink-2">
            One trail folded into two contour arches, the waypoint between its feet. A guide walks the trail ahead of you and
            marks where you stand: the mark is that sentence. Every lockup carries exactly one waypoint, the mark&apos;s; the
            wordmark alone, from 48 px, lights the leading dot of its ي.
          </p>
        </div>
        <Logo size={56} />
      </header>

      <Section n="01" note="ink = currentColor, waypoint = var(--color-accent)" title="The mark">
        <div className="grid gap-4 md:grid-cols-2">
          <Board className="grid h-[420px] place-items-center" label="paper" surface="paper">
            <Contours cx={96} cy={4} surface="paper" />
            <LogoMark className="relative" size={256} />
          </Board>
          <Board className="grid h-[420px] place-items-center" label="stage" surface="stage">
            <Contours cx={4} cy={66} surface="stage" />
            <LogoMark className="relative" size={256} />
          </Board>
        </div>
      </Section>

      <Section n="02" note="refined from the Darb draft: gap 5 → 5.5, dot r 5 → 4.75, one continuous trail" title="Construction">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <Board className="px-6 pb-4 pt-12" label="64 grid · the dotted white line is the one trail, start to end" sheet>
            <Construction />
          </Board>
          <div className="grid gap-4">
            <Board className="flex items-end justify-around px-6 pb-6 pt-14" label="optical centring in the tile (tile centre lines in green)" sheet>
              {(["box", "optical"] as const).map((c) => (
                <figure className="flex flex-col items-center gap-3" key={c}>
                  <div className="relative">
                    <AppIcon centring={c} size={150} />
                    <span className="absolute inset-x-0 top-1/2 h-px bg-ok/70" />
                    <span className="absolute inset-y-0 start-1/2 w-px bg-ok/70" />
                  </div>
                  <Caption>{c === "box" ? "box centred: reads low" : "mass centred, lifted 1.2%: kept"}</Caption>
                </figure>
              ))}
            </Board>
            <Board className="flex items-center justify-around px-6 pb-6 pt-14" label="the four drawings at the same height (stroke as % of the box)" sheet>
              {[MARK_FULL, MARK_32, MARK_24, MARK_16].map((c) => (
                <figure className="flex flex-col items-center gap-2" key={c.vb}>
                  <LogoMark cut={c.vb === 64 ? "full" : (String(c.vb) as "32" | "24" | "16")} size={80} />
                  <Caption>{`${c.vb === 64 ? "full" : `${c.vb} cut`} · ${((c.sw / c.vb) * 100).toFixed(1)}%`}</Caption>
                </figure>
              ))}
            </Board>
          </div>
        </div>
      </Section>

      <Section n="03" note="auto cut: ≤20 px the 16 cut, ≤28 px the 24 cut, ≤44 px the 32 cut; below, rasterised at real size and enlarged" title="Small sizes">
        <div className="grid gap-4 md:grid-cols-2">
          {(["paper", "stage"] as const).map((s) => (
            <Board className="flex flex-col gap-6 px-6 pb-6 pt-14" key={s} label={`${s} · 64 / 32 / 28 / 24 / 20 / 16`} surface={s}>
              <div className="flex flex-wrap items-end gap-8">
                {SIZES.map((px) => (
                  <figure className="flex flex-col items-center gap-2" key={px}>
                    <LogoMark size={px} />
                    <Caption surface={s}>{`${px} · ${pickCut(px).vb === 64 ? "full" : `${pickCut(px).vb} cut`}`}</Caption>
                  </figure>
                ))}
                <span className="mx-2 h-12 w-px bg-current opacity-20" />
                <figure className="flex flex-col items-center gap-2">
                  <div className="flex items-end gap-3">
                    <LogoMark cut="full" size={20} />
                    <LogoMark cut="full" size={16} />
                  </div>
                  <Caption surface={s}>full mark scaled</Caption>
                </figure>
              </div>
              <div className="flex flex-wrap items-end gap-5">
                <figure className="flex flex-col items-center gap-2">
                  <PixelZoom cut={MARK_16} px={16} surface={s} zoom={8} />
                  <Caption surface={s}>16 cut at 16 px</Caption>
                </figure>
                <figure className="flex flex-col items-center gap-2">
                  <PixelZoom cut={MARK_FULL} px={16} surface={s} zoom={8} />
                  <Caption surface={s}>full mark at 16 px</Caption>
                </figure>
                <figure className="flex flex-col items-center gap-2">
                  <PixelZoom cut={MARK_16} px={20} surface={s} zoom={6} />
                  <Caption surface={s}>16 cut at 20 px</Caption>
                </figure>
                <figure className="flex flex-col items-center gap-2">
                  <PixelZoom cut={MARK_24} px={24} surface={s} zoom={5} />
                  <Caption surface={s}>24 cut at 24 px</Caption>
                </figure>
                <figure className="flex flex-col items-center gap-2">
                  <PixelZoom cut={MARK_32} px={32} surface={s} zoom={4} />
                  <Caption surface={s}>32 cut at 32 px</Caption>
                </figure>
              </div>
            </Board>
          ))}
        </div>
      </Section>

      <Section n="04" note="IBM Plex Sans Arabic Bold as outlines; one detail: the ي's two dots are equal circles, the leading one the waypoint (from 48 px)" title="The wordmark «دليل»">
        <div className="grid gap-4 md:grid-cols-2">
          <Board className="grid h-[300px] place-items-center" label="paper" surface="paper">
            <Wordmark height={150} />
          </Board>
          <Board className="grid h-[300px] place-items-center" label="stage" surface="stage">
            <Wordmark height={150} />
          </Board>
          <Board className="px-10 pb-8 pt-14" label="proof: live font text (accent) under the outlines (ink): no fringe on the letters; the ي dots are redrawn" sheet>
            <WordProof />
          </Board>
          <Board className="grid grid-cols-[1fr_1.3fr] items-center gap-6 px-8 pb-6 pt-14" label="the ي dots: two circles r 6.9 (dashed: the font's own dots, same width and spacing, gap 2.0)" sheet>
            <DotsProof />
            <p className="text-[14px] text-ink-2">
              Before: a coral circle r 7.6 beside the font&apos;s smaller rounded square, 1.3 apart: two mismatched dots that
              collided. Now both are circles of the font dot&apos;s width at its own spacing, so the pair reads as the font&apos;s
              pair; only the colour of the leading one changes.
            </p>
          </Board>
          <Board className="flex flex-col justify-center gap-6 px-10 pb-8 pt-14 md:col-span-2" label={`sizes · 96 / 64 / 48 / 40 / 28 / 18 px · tone="auto": the accent ي from ${WORDMARK_ACCENT_FROM} px, all ink below`} sheet>
            <div className="flex flex-wrap items-end gap-10">
              {[96, 64, 48, 40, 28, 18].map((h) => (
                <figure className="flex flex-col items-start gap-2" key={h}>
                  <Wordmark height={h} />
                  <Caption>{`${h} px${h >= WORDMARK_ACCENT_FROM ? "" : " · ink"}`}</Caption>
                </figure>
              ))}
            </div>
            <div className="flex items-end gap-8">
              <Wordmark height={64} tone="mono" />
              <Caption>one-colour form (tone=&quot;mono&quot;), any size</Caption>
            </div>
          </Board>
        </div>
      </Section>

      <Section n="05" note={`one waypoint per lockup (the mark's; the word is all ink) · clear space = half the mark's height · horizontal: feet on the baseline, mark as tall as ل and ك`} title="Lockups">
        <div className="grid gap-4 md:grid-cols-2">
          <Board className="flex items-center px-10 pb-8 pt-14" label="horizontal · construction (accent line: the baseline; dashed: top of ل and ك)" sheet>
            <LockupConstruction layout="horizontal" surface="paper" />
          </Board>
          <Board className="px-24 pb-8 pt-14" label="stacked · construction" sheet>
            <LockupConstruction layout="stacked" surface="paper" />
          </Board>
          <Board className="grid h-[260px] place-items-center" label="horizontal · paper" surface="paper">
            <Logo size={120} />
          </Board>
          <Board className="grid h-[260px] place-items-center" label="horizontal · stage" surface="stage">
            <Contours cx={20} cy={60} surface="stage" />
            <Logo className="relative" size={120} />
          </Board>
          <Board className="grid h-[340px] place-items-center" label="stacked · paper" surface="paper">
            <Logo layout="stacked" size={230} />
          </Board>
          <Board className="grid h-[340px] place-items-center" label="stacked · stage" surface="stage">
            <Logo layout="stacked" size={230} />
          </Board>
          <Board className="flex flex-wrap items-end gap-12 px-10 pb-8 pt-14 md:col-span-2" label="in use · 64 / 40 / 32 / 24 px tall (the nav uses 32), auto cut inside (full / full / 32 / 24)" sheet>
            {[64, 40, 32, 24].map((h) => (
              <figure className="flex flex-col items-start gap-2" key={h}>
                <Logo size={h} />
                <Caption>{`${h} px`}</Caption>
              </figure>
            ))}
            <span className="h-14 w-px bg-line" />
            <div className="rounded-xl bg-stage px-5 py-4 text-on-stage" data-surface="stage">
              <Logo size={32} />
            </div>
          </Board>
        </div>
      </Section>

      <Section n="06" note={`navy tile, the mark optically centred; a quiet contour hill from ${APP_TILE.contoursFrom} px; up to ${APP_TILE.smallUpTo} px the pixel-drawn favicon tiles`} title="App tile">
        <Board className="flex flex-wrap items-end gap-10 px-10 pb-8 pt-14" label="stage · 180 / 120 (contours) · 64 / 48 / 40 (no contours) · 32 / 24 / 16 (favicon tiles) · paper · 120 / 48 / 32" sheet>
          {[180, 120, 64, 48, 40, 32, 24, 16].map((s) => (
            <figure className="flex flex-col items-center gap-2" key={s}>
              <AppIcon size={s} />
              <Caption>{s}</Caption>
            </figure>
          ))}
          <span className="h-24 w-px bg-line" />
          {[120, 48, 32].map((s) => (
            <figure className="flex flex-col items-center gap-2" key={`p${s}`}>
              <AppIcon size={s} surface="paper" />
              <Caption>{`paper ${s}`}</Caption>
            </figure>
          ))}
        </Board>
      </Section>

      <Section n="07" note="the mark beside the product icons at 24 px (icons may still be placeholders while the icon agents work)" title="One family">
        <div className="grid gap-4 md:grid-cols-2">
          {(["paper", "stage"] as const).map((s) => (
            <Board className="flex flex-wrap items-center gap-7 px-8 pb-8 pt-14" key={s} label={`${s} · 24 px · stroke 2, one waypoint each`} surface={s}>
              <LogoMark size={24} />
              <IconPath size={24} />
              <IconSkills size={24} />
              <IconAdvisor size={24} />
              <IconXp size={24} />
              <IconStreak size={24} />
              <IconBadge size={24} />
              <span className="mx-1 h-8 w-px bg-current opacity-20" />
              <LogoMark size={32} />
              <IconPath size={32} />
              <IconAdvisor size={32} />
            </Board>
          ))}
        </div>
      </Section>

      <Section n="08" note="kept: B. Two changes tried to tie the mark closer to the product; neither beat it" title="Studies">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { k: "B · kept", d: MARK_FULL.d, dot: MARK_FULL.dot, extra: null, verdict: "the waypoint stands between the feet: grounded, reads as a trail and a gate" },
            { k: "C · dot raised to the window's centre", d: MARK_FULL.d, dot: { ...MARK_FULL.dot, cy: 39 }, extra: null, verdict: "reads as a keyhole or an eye; loses 'between its feet'" },
            {
              k: "D · the trail runs out dotted",
              d: MARK_FULL.d.replace("M56 50V38", "M56 41V38"),
              dot: MARK_FULL.dot,
              extra: [48.5, 55],
              verdict: "says 'solid, waypoint, dotted', but reads as a stray colon and is noise at 32 px",
            },
          ].map((v) => (
            <Board className="flex flex-col gap-4 px-6 pb-6 pt-14" key={v.k} label={v.k} sheet>
              <div className="flex items-end gap-6">
                {[128, 32].map((px) => (
                  <svg fill="none" height={px} key={px} viewBox="0 0 64 64" width={px}>
                    <path d={v.d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={7} />
                    {v.extra?.map((y) => (
                      <circle cx={56} cy={y} fill="currentColor" key={y} r={2.4} />
                    ))}
                    <circle cx={v.dot.cx} cy={v.dot.cy} r={v.dot.r} style={{ fill: "var(--color-accent)" }} />
                  </svg>
                ))}
              </div>
              <p className="text-[14px] text-ink-2">{v.verdict}</p>
            </Board>
          ))}
        </div>
      </Section>

      <Section n="09" note="src/app/icon.svg: a navy tile (the 16 drawing, the 32 drawing when rastered above 24 px); no media query on colour" title="Favicon">
        <div className="grid gap-4 md:grid-cols-2">
          <Board className="flex flex-col gap-4 px-8 pb-8 pt-14" label="browser tabs · the real file /icon.svg on four tab colours" sheet>
            {(
              [
                ["bg-sunk text-ink", "light chrome"],
                ["border border-line bg-sheet text-ink", "white tab"],
                ["bg-ink-2 text-on-stage", "dark chrome"],
                ["bg-stage text-on-stage", "navy (the tile's own colour)"],
              ] as const
            ).map(([cls, name]) => (
              <div className="flex items-center gap-4" key={name}>
                <div className={`flex w-60 items-center gap-2.5 rounded-t-lg px-4 py-2.5 ${cls}`} dir="rtl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" height={16} src="/icon.svg" width={16} />
                  <span className="text-[14px]">دليل · مساري</span>
                </div>
                <Caption>{name}</Caption>
              </div>
            ))}
          </Board>
          <Board className="flex flex-col gap-4 px-8 pb-8 pt-14" label="the file rasterised at 16 px and 32 px (8x and 4x, hard pixels)" sheet>
            <div className="flex flex-wrap items-end gap-4">
              {(["--color-sunk", "--color-ink-2", "--color-stage"] as const).map((bg) => (
                <figure className="flex flex-col items-center gap-2" key={bg}>
                  <FileZoom bgVar={bg} px={16} zoom={8} />
                  <Caption>{`16 · ${bg.replace("--color-", "")}`}</Caption>
                </figure>
              ))}
              <figure className="flex flex-col items-center gap-2">
                <FileZoom bgVar="--color-sunk" px={32} zoom={4} />
                <Caption>32 · sunk</Caption>
              </figure>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="icon.svg at 16" height={16} src="/icon.svg" width={16} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="icon.svg at 32" height={32} src="/icon.svg" width={32} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="icon.svg at 64" height={64} src="/icon.svg" width={64} />
              <Caption>the file itself at 16 / 32 / 64</Caption>
              <span className="mx-2 h-10 w-px bg-line" />
              <LogoFavicon cut={16} size={32} tile />
              <LogoFavicon cut={32} size={32} tile />
              <Caption>{`<LogoFavicon tile /> (${FAVICON_16.vb} and ${FAVICON_32.vb} drawings at 32)`}</Caption>
            </div>
          </Board>
        </div>
        <p className="mt-3 text-[14px] text-ink-3">
          A favicon cannot read CSS variables, so icon.svg carries the current hex of stage, on-stage and accent; the export
          script regenerates it from the tokens. The tile reads on any tab colour; the old bare navy mark vanished on dark
          chrome (about 1.4:1).
        </p>
      </Section>

      <Section n="10" note="node artifacts/foundation/brand/tools/export.mjs writes these to public/brand (token colours resolved to hex)" title="Exports">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {EXPORTS.map((e) => (
            <Board
              className="grid h-[200px] place-items-center px-6 pb-6 pt-12"
              key={e.name}
              label={`${e.name}.svg`}
              sheet={e.surface === "paper"}
              surface={e.surface}
            >
              <div data-export={e.name}>{e.node}</div>
            </Board>
          ))}
        </div>
      </Section>

      <p className="text-[13px] text-ink-3">{`Lockup constants: horizontal mark ${LOCKUP.horizontal.markInk} units tall (word ascender 74), gap ${LOCKUP.horizontal.gap} x mark; stacked mark ${LOCKUP.stacked.markInk}.`}</p>
    </main>
  );
}
