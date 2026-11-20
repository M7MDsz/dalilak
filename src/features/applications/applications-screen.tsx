"use client";
// Owner: applications. `/applications` (spec 3.9, 7.5): follow each application like a real one, while saying plainly that
// it is a simulation. Heading «طلباتي» (its <h1> is lg:sr-only: the desktop top bar shows it, ARCH 11.1) with the line
// «تابع كل طلب قدّمته.», the simulation banner, then one card per application, newest first; or the empty state.
// Statuses are recomputed every 5 s while the page is open (useClock(APPLICATION_TIMING.refreshMs), spec 7.5).
// No loading and no error state (local data). No XP is paid here.
import type { ReactNode } from "react";

import { IconArrowForward, IconInfo } from "@/components/icons";
import { NavLink, PageTransition } from "@/components/motion";
import { Card, EmptyState, buttonStyles } from "@/components/ui";
import { SAMPLE_COPY } from "@/lib/copy";
import { APPLICATION_TIMING } from "@/lib/data";
import { hrefFor } from "@/lib/routes";
import { useClock, useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";

import { ApplicationCard } from "./application-card";
import { APPLICATIONS_COPY } from "./copy";

export function ApplicationsScreen(): ReactNode {
  const user = useCurrentUser();
  const clock = useClock(APPLICATION_TIMING.refreshMs);
  if (!user) return null; // the Guard renders nothing once signed out; children may assume a user

  const applications = [...user.applications].sort((a, b) => b.sentAt - a.sentAt);

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-gutter pt-6 pb-12 @min-[900px]/content:pt-2 lg:pb-28">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-fg lg:sr-only">{APPLICATIONS_COPY.heading}</h1>
            <p className="text-body text-fg-2">{APPLICATIONS_COPY.subline}</p>
          </div>
          <SimulationBanner />
        </header>

        {applications.length === 0 ? (
          <Card padding="none">
            <EmptyState
              action={
                <NavLink className={buttonStyles({ variant: "primary" })} data-testid={TID.applications.goJobs} href={hrefFor({ screen: "jobs" })}>
                  {APPLICATIONS_COPY.emptyAction}
                  <IconArrowForward size={20} />
                </NavLink>
              }
              body={<span className="block text-balance">{APPLICATIONS_COPY.emptyBody}</span>}
              className="py-14"
              testId={TID.applications.empty}
              title={APPLICATIONS_COPY.emptyTitle}
            />
          </Card>
        ) : (
          <ol className="flex flex-col gap-5" data-testid={TID.applications.list}>
            {applications.map((application) => (
              <li key={application.jobId}>
                <ApplicationCard application={application} clock={clock} user={user} />
              </li>
            ))}
          </ol>
        )}
      </main>
    </PageTransition>
  );
}

/**
 * The page's one note: «طلبات الوظائف ترسلها أنت من الإعلان الأصلي، ولا نرى ردّ الجهة.», with a dashed edge (a lead before
 * a colon, if the copy ever has one, is set apart so it is read first).
 */
function SimulationBanner(): ReactNode {
  const text = SAMPLE_COPY.applicationsBanner;
  const cut = text.indexOf(":");
  const lead = cut > 0 ? text.slice(0, cut + 1) : "";
  const rest = cut > 0 ? text.slice(cut + 1) : text;
  return (
    <p className="flex items-start gap-3 rounded-card border border-dashed border-border-strong px-4 py-3 text-small text-fg-2">
      <IconInfo className="mt-0.5 shrink-0 text-fg-3" size={20} waypoint="muted" />
      <span>
        {lead ? <span className="font-semibold text-fg">{lead}</span> : null}
        {rest}
      </span>
    </p>
  );
}
