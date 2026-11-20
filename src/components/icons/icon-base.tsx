import type { ReactNode } from "react";

/**
 * The contract every Masari icon follows (lead decision; do not change the props).
 * - 24 x 24 grid, stroke only, round caps and joins, colour from `currentColor`.
 * - Stroke weight 2 up to 28 px, 1.75 above (so small icons hold on a projector).
 * - Exactly one waypoint dot per icon: <circle className="wp" r="1.75" />. It takes the accent colour.
 *   `waypoint="muted"` draws it in the icon's own colour (inactive navigation), `"off"` hides it.
 */
export interface IconProps {
  readonly size?: number;
  readonly className?: string;
  readonly waypoint?: "on" | "muted" | "off";
  readonly strokeWidth?: number;
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  readonly title?: string;
}

export function IconBase({ size = 24, className, waypoint = "on", strokeWidth, title, children }: IconProps & { readonly children: ReactNode }) {
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={className}
      data-wp={waypoint}
      fill="none"
      height={size}
      role={title === undefined ? undefined : "img"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth ?? (size <= 28 ? 2 : 1.75)}
      style={{ flex: "none" }}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}
