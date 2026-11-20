"use client";
import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";

import { IconCheckCircle, IconClose, IconRankUp, IconWarning } from "@/components/icons";
import { NavLink } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { formatGain } from "@/lib/format";

import { BadgeMedal } from "./badge-medal";
import { XpGlyph } from "./xp";

// One toast position for the whole app, under the top bar (playbook 3.13): top centre on a phone; from 1024 px under the
// user chip, at the content's top inline-end corner (21 Nov 2026: the centre sat over the middle of the map on «مساري»),
// clear of the docked advisor panel (--content-inset-end). Newest on top, at most three, each on its own timer.
// Enter: drops 8 px and fades in, 200 ms. Leave: fades, 150 ms.

export type ToastData =
  | { readonly kind: "xp"; readonly amount: number; readonly reason: string; readonly rank?: number | null }
  | {
      readonly kind: "badge";
      readonly badgeId: string;
      readonly name: string;
      readonly description: string;
      readonly emblem: ReactNode;
      readonly href?: string;
    }
  | { readonly kind: "note"; readonly tone?: "default" | "ok" | "warn" };

/** The app's toast manager. Module level, so the action dispatcher can raise a toast from outside React. */
export const toastManager = Toast.createToastManager<ToastData>();

const XP_MS = 3500;
const BADGE_MS = 5000;
const NOTE_MS = 4000;

interface NoteOptions {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly tone?: "default" | "ok" | "warn";
  readonly timeout?: number;
}

function note({ title, description, tone = "default", timeout = NOTE_MS }: NoteOptions): string {
  return toastManager.add({ title, description, timeout, data: { kind: "note", tone } });
}

/**
 * toast(): a plain note. toast.xp(): «+100 XP» with its reason (and the rank line when the weekly rank improved).
 * toast.badge(): «شارة جديدة» with the medal. All return the toast id; toast.close(id) closes one.
 */
export const toast = Object.assign(note, {
  xp({ amount, reason, rank = null }: { amount: number; reason: string; rank?: number | null }): string {
    return toastManager.add({
      title: `${formatGain(amount)} XP`,
      description: reason,
      timeout: XP_MS,
      data: { kind: "xp", amount, reason, rank },
    });
  },
  badge({ badgeId, name, description, emblem, href = "/profile" }: { badgeId: string; name: string; description: string; emblem: ReactNode; href?: string }): string {
    return toastManager.add({
      title: name,
      description,
      timeout: BADGE_MS,
      data: { kind: "badge", badgeId, name, description, emblem, href },
    });
  },
  close(id?: string) {
    toastManager.close(id);
  },
});

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  return (
    <Toast.Provider limit={3} timeout={NOTE_MS} toastManager={toastManager}>
      {children}
    </Toast.Provider>
  );
}

const card =
  "flex items-start gap-3 rounded-sheet border border-border bg-surface p-3 pe-2 text-fg shadow-float";

function CloseButton() {
  return (
    <Toast.Close
      aria-label="إغلاق"
      className="grid size-9 shrink-0 place-items-center rounded-full text-fg-3 transition-[background-color,color,scale] duration-200 ease-out hover:bg-hover hover:text-fg active:scale-[0.97] active:transition-none"
    >
      <IconClose size={18} waypoint="off" />
    </Toast.Close>
  );
}

function XpToastBody({ amount, rank }: { amount: number; rank?: number | null }) {
  return (
    <div className={card}>
      {/* the XP coin: a brass disk with a struck rim and the spot height in ink (the medal family, never a road sign).
          The token that flies to the user chip (xp-fly) is taken from here: data-xp-token */}
      <span className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-xp-line bg-xp text-ink" data-xp-token="">
        <XpGlyph size={24} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <Toast.Title className="text-h3 leading-tight text-xp-fg" render={<p />}>
          <bdi dir="ltr">{formatGain(amount)} XP</bdi>
        </Toast.Title>
        <Toast.Description className="text-small text-fg-2" />
        {rank ? (
          <p className="mt-1 flex items-center gap-1.5 text-small font-medium text-ok-fg" data-testid="toast-xp-rank">
            <IconRankUp size={16} waypoint="off" />
            <span>صعدت إلى المركز {rank} هذا الأسبوع</span>
          </p>
        ) : null}
      </div>
      <CloseButton />
    </div>
  );
}

function BadgeToastBody({ emblem, href }: { emblem: ReactNode; href: string }) {
  return (
    <div className={card}>
      <BadgeMedal bare emblem={emblem} size="sm" state="earned" />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-caption text-fg-3">شارة جديدة</p>
        <Toast.Title className="text-title text-fg" render={<p />} />
        <Toast.Description className="text-small text-fg-2" />
        <NavLink className="trail mt-1 inline-flex h-8 items-center text-small font-semibold text-fg [--trail-y:0.25rem] hover:trail-walk" href={href}>
          عرض الشارات
        </NavLink>
      </div>
      <CloseButton />
    </div>
  );
}

function NoteToastBody({ tone }: { tone: "default" | "ok" | "warn" }) {
  return (
    <div className={cn(card, "items-center")}>
      {tone === "ok" ? <IconCheckCircle className="ms-1 shrink-0 text-ok-fg" size={22} waypoint="off" /> : null}
      {tone === "warn" ? <IconWarning className="ms-1 shrink-0 text-warn-fg" size={22} waypoint="off" /> : null}
      <div className="min-w-0 flex-1 ps-1">
        <Toast.Title className="text-title text-fg" render={<p />} />
        <Toast.Description className="text-small text-fg-2" />
      </div>
      <CloseButton />
    </div>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastData>();
  return toasts.map((t) => {
    const data = t.data;
    const testId = data?.kind === "xp" ? "toast-xp" : data?.kind === "badge" ? `toast-badge-${data.badgeId}` : "toast-note";
    return (
      <Toast.Root
        className={cn(
          "absolute inset-x-0 top-0 select-none outline-none",
          "[transform:translateY(calc(var(--toast-offset-y)+var(--toast-index)*0.625rem+var(--toast-swipe-movement-y)))]",
          "transition-[transform,opacity] duration-200 ease-out",
          "data-starting-style:[transform:translateY(-0.5rem)] data-starting-style:opacity-0",
          "data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in data-limited:opacity-0",
          "focus-visible:[&>div]:outline-2 focus-visible:[&>div]:outline-offset-2 focus-visible:[&>div]:outline-focus",
        )}
        data-testid={testId}
        data-value={data?.kind === "xp" ? data.amount : undefined}
        key={t.id}
        swipeDirection="up"
        toast={t}
      >
        {data?.kind === "xp" ? <XpToastBody amount={data.amount} rank={data.rank} /> : null}
        {data?.kind === "badge" ? <BadgeToastBody emblem={data.emblem} href={data.href ?? "/profile"} /> : null}
        {data?.kind === "note" || !data ? <NoteToastBody tone={data?.kind === "note" ? (data.tone ?? "default") : "default"} /> : null}
      </Toast.Root>
    );
  });
}

/** The viewport. Rendered once by src/components/providers.tsx; exists from the first load (aria-live). */
export function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport
        className="fixed inset-x-0 top-[calc(var(--shell-top)+0.75rem)] z-toast mx-auto w-[min(26rem,calc(100vw-2rem))] outline-none lg:start-auto lg:end-[calc(var(--content-inset-end,0px)+2rem)] lg:mx-0"
        data-surface="paper"
      >
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  );
}
