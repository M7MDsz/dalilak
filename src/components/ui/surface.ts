// Which surface an element sits on. Base UI portals popups to <body>, so a popup opened from inside a <Stage> would lose
// data-surface="stage"; popups of the kit read the surface of their trigger when they open and repeat it on themselves.
export type Surface = "paper" | "stage";

export function surfaceOf(el: Element | null | undefined): Surface {
  const host = el?.closest("[data-surface]");
  return host?.getAttribute("data-surface") === "stage" ? "stage" : "paper";
}
