// The avatar cast (docs/PRODUCT-SPEC.md 9.6). The ids and kinds are a contract (docs/DESIGN-BRIEF.md section 6):
// av-01..04 neutral (the defaults of new accounts), av-05..08 women, av-09..12 men.
// Labels are short Arabic descriptions for screen readers and the avatar picker. They name what does not change with the
// palette (shape, headwear, fixed cloth colours), never a brand colour.

export type AvatarId = "av-01" | "av-02" | "av-03" | "av-04" | "av-05" | "av-06" | "av-07" | "av-08" | "av-09" | "av-10" | "av-11" | "av-12";

export type AvatarKind = "f" | "m" | "n";

export interface AvatarInfo {
  readonly id: AvatarId;
  readonly label: string;
  readonly kind: AvatarKind;
}

export const AVATARS: readonly AvatarInfo[] = [
  { id: "av-01", label: "شخصية بقبعة رحّالة عريضة", kind: "n" },
  { id: "av-02", label: "شخصية بقبعة طيّار ونظارة واقية", kind: "n" },
  { id: "av-03", label: "شخصية بقلنسوة سفر", kind: "n" },
  { id: "av-04", label: "شخصية بقبعة صوف وسمّاعات", kind: "n" },
  { id: "av-05", label: "امرأة بحجاب ملفوف", kind: "f" },
  { id: "av-06", label: "امرأة بحجاب أسود ونظارة", kind: "f" },
  { id: "av-07", label: "امرأة بحجاب فاتح مرفوع", kind: "f" },
  { id: "av-08", label: "امرأة بشعر طويل", kind: "f" },
  { id: "av-09", label: "رجل بشماغ أحمر وعقال", kind: "m" },
  { id: "av-10", label: "رجل بغترة بيضاء وعقال", kind: "m" },
  { id: "av-11", label: "رجل بشعر مجعّد ونظارة", kind: "m" },
  { id: "av-12", label: "رجل بلحية كثيفة", kind: "m" },
] as const;

const IDS = new Set<string>(AVATARS.map((a) => a.id));

/** True for one of the twelve ids. */
export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && IDS.has(value);
}
