"use client";
// Owner: shell. The phone shell of spec 2.4 (anything narrower than 1024 px).
// Top bar: the logo at the inline-start, the compact user chip at the inline-end; no page heading (the page's own <h1>
// is its first line) and no next-step pill (the next step is the card at the top of /path).
// Bottom tab bar: «مساري» · «دليل التعلّم» · «دليلك» (centre, larger: opens the advisor, `shell-advisor-launcher`) ·
// «الوظائف» · «المزيد» (`shell-more`, opens a bottom sheet with «المهارات» · «سيرتي» · «طلباتي» · «المتصدرون» · «ملفي»).
// Same test ids as the desktop navigation; only one of the two is rendered.
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand";
import { DaleelGlyph } from "@/components/chat";
import { IconMore } from "@/components/icons";
import { NavLink, Sheet, useShownPathname } from "@/components/motion";
import { cn, press } from "@/components/ui";
import { NAV_LABEL } from "@/lib/copy";
import { hrefFor } from "@/lib/routes";
import { useUi } from "@/lib/store";
import { TID } from "@/lib/testids";

import { activeNavItem, isMoreActive, MORE_ITEMS, NAV_HREF, PHONE_TABS_AFTER_CENTRE, PHONE_TABS_BEFORE_CENTRE, type NavItemId } from "./nav";
import { NAV_ICON } from "./nav-icons";
import { UserChipCompact } from "./user-chip";

/** Heights the shell exports: --shell-top (toasts sit under the top bar) and --shell-bottom (pinned things sit above
 *  the tab bar, spec 2.4). The tab bar adds the safe-area inset on top of its own height. */
export const PHONE_TOP_BAR_HEIGHT = "4rem";
export const PHONE_TAB_BAR_HEIGHT = "4.5rem";

export function PhoneTopBar({ className }: { readonly className?: string }): ReactNode {
  return (
    <header className={cn("sticky top-0 z-sticky flex h-16 items-center justify-between gap-3 bg-bg px-gutter", className)}>
      <NavLink className="flex h-11 items-center rounded-control" href={hrefFor({ screen: "path" })}>
        <Logo size={26} />
      </NavLink>
      <UserChipCompact />
    </header>
  );
}

export function TabBar({ className }: { readonly className?: string }): ReactNode {
  const pathname = useShownPathname(); // the tapped tab lights at once (page-transition.tsx)
  const active = activeNavItem(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const openAdvisor = useUi((state) => state.openAdvisor);
  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]",
          className,
        )}
      >
        <ul className="mx-auto grid h-18 max-w-lg grid-cols-5 items-stretch px-1">
          {PHONE_TABS_BEFORE_CENTRE.map((id) => (
            <li className="flex" key={id}>
              <TabLink active={active === id} id={id} />
            </li>
          ))}
          <li className="flex justify-center">
            <button
              className={cn("group/daleel relative -mt-5 flex flex-col items-center gap-1 rounded-full", press)}
              data-testid={TID.shell.advisorLauncher}
              data-wp-live=""
              onClick={openAdvisor}
              type="button"
            >
              <span className="grid size-15 place-items-center rounded-full border-4 border-surface bg-solid text-on-solid">
                <DaleelGlyph size={30} />
              </span>
              <span className="text-caption font-semibold text-fg">{NAV_LABEL.advisor}</span>
            </button>
          </li>
          {PHONE_TABS_AFTER_CENTRE.map((id) => (
            <li className="flex" key={id}>
              <TabLink active={active === id} id={id} />
            </li>
          ))}
          <li className="flex">
            <button
              aria-current={isMoreActive(pathname) ? "page" : undefined}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={cn(tabClass(isMoreActive(pathname)), press)}
              data-testid={TID.shell.more}
              onClick={() => setMoreOpen(true)}
              type="button"
            >
              <IconMore size={24} waypoint={isMoreActive(pathname) ? "on" : "muted"} />
              <span>{NAV_LABEL.more}</span>
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet active={active} onOpenChange={setMoreOpen} open={moreOpen} />
    </>
  );
}

function tabClass(active: boolean): string {
  return cn(
    "flex w-full flex-col items-center justify-center gap-1 rounded-control text-caption transition-colors duration-200 ease-out focus-visible:outline-offset-[-3px]",
    active ? "font-bold text-fg" : "font-medium text-fg-2",
  );
}

function TabLink({ id, active }: { readonly id: NavItemId; readonly active: boolean }): ReactNode {
  const Icon = NAV_ICON[id];
  return (
    <NavLink
      aria-current={active ? "page" : undefined}
      className={cn(tabClass(active), press)}
      data-testid={TID.shell.nav(id)}
      data-wp-live={active ? "" : undefined}
      href={NAV_HREF[id]}
    >
      <Icon size={24} waypoint={active ? "on" : "muted"} />
      <span>{NAV_LABEL[id]}</span>
    </NavLink>
  );
}

/** «المزيد»: the five other pages, as a bottom sheet (the design system's Sheet; it traps focus and returns it). */
function MoreSheet({ open, onOpenChange, active }: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly active: NavItemId | null }): ReactNode {
  return (
    <Sheet onOpenChange={onOpenChange} open={open} size="sm" title={NAV_LABEL.more}>
      <ul className="-mx-2 flex flex-col gap-1 pb-1">
        {MORE_ITEMS.map((id) => {
          const Icon = NAV_ICON[id];
          const on = active === id;
          return (
            <li key={id}>
              <NavLink
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center gap-3.5 rounded-control px-3 text-title transition-colors duration-200 ease-out",
                  on ? "bg-surface-2 font-bold text-fg" : "font-medium text-fg-2 hover:bg-hover hover:text-fg",
                  press,
                )}
                data-testid={TID.shell.nav(id)}
                data-wp-live={on ? "" : undefined}
                href={NAV_HREF[id]}
                onClick={() => onOpenChange(false)}
              >
                <Icon size={24} waypoint={on ? "on" : "muted"} />
                <span>{NAV_LABEL[id]}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
