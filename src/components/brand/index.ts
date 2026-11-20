// Dalilak «دليلك» brand: the mark, its small cuts, the wordmark, the lockups, the favicon tiles and the app tile.
// Every colour comes from a token: ink is currentColor, the waypoint is var(--color-accent).
export { FAVICON_16, FAVICON_32, MARK_16, MARK_24, MARK_32, MARK_FULL, type MarkCut, type TileCut, WORDMARK } from "./geometry";
export {
  LogoFavicon,
  type LogoFaviconProps,
  LogoMark,
  type LogoMarkProps,
  type LogoTone,
  type MarkCutName,
  MarkShape,
  pickCut,
  pickFaviconCut,
} from "./mark";
export { Wordmark, WORDMARK_ACCENT_FROM, WORDMARK_RATIO, type WordmarkProps, type WordmarkTone, WordShape } from "./wordmark";
export { Logo, LOCKUP, type LockupGeometry, lockupGeometry, type LogoLayout, type LogoProps } from "./logo";
export { APP_TILE, AppIcon, type AppIconProps, type AppIconSurface, tilePlacement } from "./app-icon";
