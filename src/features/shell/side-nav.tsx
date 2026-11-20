"use client";
// Owner: shell. The desktop side navigation of spec 2.3 / 2.5 (1024 px and wider), on the inline-start side (the right in
// RTL): the logo and wordmark «دليلك» (links to /path), the eight items in three groups separated by space, and at the
// bottom one quiet line «عرض تجريبي · بيانات تجريبية». The active item is a white sheet that slides between items
// (a shared layoutId; the shell does not move on a page change, only this marker does) and its icon keeps the coral
// waypoint; every other icon's waypoint is muted. No item carries a dot or a counter.
import { LayoutGroup, motion } from "motion/react";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand";
import { NavLink, useInstant, useShownPathname } from "@/components/motion";
import { ThemeToggle } from "@/features/shared";
import { cn } from "@/components/ui";
import { NAV_LABEL } from "@/lib/copy";
import { spring } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";

import { activeNavItem, NAV_GROUPS, NAV_HREF, type NavItemId } from "./nav";
import { NAV_ICON } from "./nav-icons";

/** The rail's width; the shell pads the content by the same amount and exports it as --content-inset-start. */
export const SIDE_NAV_WIDTH = "14.5rem";

export function SideNav({ className }: { readonly className?: string }): ReactNode {
  const pathname = useShownPathname(); // the clicked item lights at once (page-transition.tsx)
  const active = activeNavItem(pathname);
  return (
    <aside className={cn("fixed inset-y-0 start-0 z-sticky flex w-58 flex-col border-e border-border bg-bg px-4 pt-6 pb-4", className)}>
      <NavLink className="mb-7 flex h-10 items-center self-start rounded-control px-2.5" href={hrefFor({ screen: "path" })}>
        <Logo size={30} />
      </NavLink>
      <nav className="flex flex-col gap-5">
        <LayoutGroup id="shell-side-nav">
          {NAV_GROUPS.map((group, g) => (
            <ul className="flex flex-col gap-1" key={g}>
              {group.map((id) => (
                <li key={id}>
                  <SideNavItem active={active === id} id={id} />
                </li>
              ))}
            </ul>
          ))}
        </LayoutGroup>
      </nav>
      {/* the design switch (هادئ · لعبة), then the one quiet line */}
      <ThemeToggle className="mt-auto px-2.5 pt-6" />
      <p className="pt-3 text-center text-caption text-fg-3">عرض تجريبي · بيانات تجريبية</p>
    </aside>
  );
}

function SideNavItem({ id, active }: { readonly id: NavItemId; readonly active: boolean }): ReactNode {
  const instant = useInstant();
  const Icon = NAV_ICON[id];
  return (
    <NavLink
      aria-current={active ? "page" : undefined}
      className={cn(
        "skin-nav relative flex h-11 items-center gap-3 rounded-control px-3 text-body transition-colors duration-200 ease-out",
        active ? "font-bold text-fg" : "font-medium text-fg-2 hover:text-fg",
      )}
      data-testid={TID.shell.nav(id)}
      data-wp-live={active ? "" : undefined}
      href={NAV_HREF[id]}
    >
      {active ? (
        <motion.span
          aria-hidden
          className="skin-nav-active absolute inset-0 rounded-control border border-border bg-surface"
          layoutId="shell-side-nav-active"
          transition={instant ? { duration: 0 } : spring.gentle}
        />
      ) : null}
      <Icon className="relative" size={22} waypoint={active ? "on" : "muted"} />
      <span className="relative">{NAV_LABEL[id]}</span>
    </NavLink>
  );
}
