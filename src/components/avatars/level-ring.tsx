// The level ring: seven contour segments around the avatar, lit up to the level (no numeral). It starts at 12 o'clock and
// runs clockwise, and it speaks the product's progress grammar: lit segments are a solid line, the ones still ahead are a
// dotted line (like the XP bar and the roadmap). The dotted slots use the strong border tone, so the seven-slot frame
// stays readable at 32 px even at level 1.
// The tier shifts the lit tone, never to the accent: levels 1-4 ink (the surface's text colour, so it flips on the
// stage), 5-6 bronze, 7 gold. Bronze and gold are the XP family: a level is what XP adds up to.
// Geometry is computed in pixels, so the stroke, the dots and the gaps hold at 24, 32 and 96 px alike.

const SEGMENTS = 7;

/** Stroke, gap between segments, and the space between ring and face, in px for a given avatar size. */
export function ringMetrics(size: number) {
  const stroke = Math.min(5, Math.max(2, size * 0.058));
  const gap = Math.max(1.7, size * 0.036);
  const air = size <= 32 ? 1.1 : Math.max(1.5, size * 0.028);
  return { stroke, gap, air, inset: stroke + air };
}

/** The lit tone of a level, as a CSS colour. Mixed with the surface text colour, so it reads on paper and on the stage. */
export function ringTone(level: number): string {
  if (level >= 7) return "color-mix(in oklab, var(--color-xp) 86%, var(--fg, var(--color-ink)))";
  if (level >= 5) return "color-mix(in oklab, var(--color-xp-line) 84%, var(--fg, var(--color-ink)))";
  return "var(--fg, var(--color-ink))";
}

const UNLIT = "var(--border-strong, var(--color-line-strong))";

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function LevelRing({ size, level }: { readonly size: number; readonly level: number }) {
  const lit = Math.max(0, Math.min(SEGMENTS, Math.round(level)));
  const { stroke, gap } = ringMetrics(size);
  const c = size / 2;
  const r = c - stroke / 2;
  const slot = (2 * Math.PI * r) / SEGMENTS;
  // the drawn arc is shorter than its slot by the visible gap and by the two round caps
  const arc = Math.max(0.5, slot - gap - stroke);
  const half = arc / r / 2;
  // the dotted slots: dots of the stroke's diameter, spaced so a dot sits exactly on each end of the arc
  const dots = Math.max(1, Math.round(arc / (stroke * 1.6)));
  const pitch = (arc - 0.01) / dots;
  const point = (t: number) => `${r3(c + r * Math.sin(t))} ${r3(c - r * Math.cos(t))}`;
  const tone = ringTone(lit);
  return (
    <svg
      aria-hidden
      data-level={lit}
      fill="none"
      height={size}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const mid = ((i + 0.5) / SEGMENTS) * 2 * Math.PI;
        const on = i < lit;
        return (
          <path
            d={`M${point(mid - half)}A${r3(r)} ${r3(r)} 0 0 1 ${point(mid + half)}`}
            data-lit={on ? "" : undefined}
            key={i}
            stroke={on ? tone : UNLIT}
            strokeDasharray={on ? undefined : `0 ${r3(pitch)}`}
            strokeLinecap="round"
            strokeWidth={on ? stroke : stroke * 0.92}
          />
        );
      })}
    </svg>
  );
}
