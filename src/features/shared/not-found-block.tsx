"use client";
// Owner: shell. Spec 2.2: the not-found block inside the shell for an unknown /jobs/[id] or /learn/[id] (and the body of
// the app's own not-found page): «هذه الصفحة غير موجودة.» with the button «رجوع لمساري» (`shell-notfound-home`, opens
// /path). The page that renders it keeps its own <PageTransition> as the outermost element; this block adds none.
import type { ReactNode } from "react";

import { IconArrowForward } from "@/components/icons";
import { NavLink } from "@/components/motion";
import { buttonStyles, Card, EmptyState } from "@/components/ui";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";

export function NotFoundBlock(): ReactNode {
  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col px-gutter py-8 @min-[900px]/content:py-14">
      <Card className="mx-auto w-full max-w-xl" padding="none">
        <EmptyState
          action={
            <NavLink className={buttonStyles({ variant: "primary" })} data-testid={TID.shell.notFoundHome} href={hrefFor({ screen: "path" })}>
              رجوع لمساري
              <IconArrowForward size={20} />
            </NavLink>
          }
          className="py-12"
          title="هذه الصفحة غير موجودة."
        />
      </Card>
    </div>
  );
}
