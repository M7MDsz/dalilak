"use client";
// Owner: profile (20 Nov 2026, owner's part 2). «الشركة اللي في بالك» on «ملفي»: the company the user named in onboarding
// step 7 (or none), with «غيّر» (a sheet of the real employers of their field and the others, or a typed name, matched
// offline like «دليلك» does) and «امسح». Changing it pays nothing and leaves the target as it is; the map's job ads read
// it through engine `dreamCompany`. The careers page (checked 20 Nov 2026) opens in a new tab when there is one.
import { useState, type ReactNode } from "react";

import { IconArrowForward } from "@/components/icons";
import { Sheet } from "@/components/motion";
import { Button, Chip, TextField, cn } from "@/components/ui";
import { getCompany } from "@/lib/data";
import { companyChoices, companyField, dreamCompany, matchCompany } from "@/lib/engine";
import { CompanyMark } from "@/features/shared/company-mark";
import { useAppStore } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CompanyId, JobFieldId, UserState } from "@/lib/types";

import { PROFILE_COPY } from "./copy";

/** The row of «معلوماتي»: the label, the company (or «لم تحدّدها بعد»), its careers page, «غيّر» and «امسح». */
export function CompanyRow({ user }: { readonly user: UserState }): ReactNode {
  const [open, setOpen] = useState(false);
  const dream = dreamCompany(user);
  const url = dream?.company.careersUrl ?? null;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3 @min-[640px]/content:col-span-2"
      data-testid={TID.profile.company}
      data-value={dream?.id ?? "none"}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 @min-[640px]/content:justify-start">
        <dt className="shrink-0 text-small text-fg-2">{PROFILE_COPY.company}</dt>
        <dd className={cn("inline-flex min-w-0 items-center gap-2 text-body", dream ? "font-semibold text-fg" : "text-fg-3")}>
          {dream ? <CompanyMark company={dream.company} size={22} /> : null}
          {dream ? dream.company.short : PROFILE_COPY.companyNone}
          {url ? (
            <a className="ms-1 text-small font-medium text-fg-2 underline decoration-border-strong underline-offset-4 hover:text-fg" href={url} rel="noreferrer" target="_blank">
              {PROFILE_COPY.companyCareers}
            </a>
          ) : null}
        </dd>
      </div>
      <dd className="flex w-full shrink-0 justify-end gap-3 @min-[640px]/content:w-auto">
        <Button data-testid={TID.profile.companyChange} icon={<IconArrowForward size={18} />} onClick={() => setOpen(true)} size="sm" variant="ghost">
          {dream ? PROFILE_COPY.companyChange : PROFILE_COPY.companyPick}
        </Button>
        {dream ? (
          <Button data-testid={TID.profile.companyClear} onClick={() => useAppStore.getState().setDreamCompany("none")} size="sm" variant="ghost">
            {PROFILE_COPY.companyClear}
          </Button>
        ) : null}
      </dd>
      <CompanyPicker current={dream?.id ?? null} field={companyField(user.answers)} onOpenChange={setOpen} open={open} />
    </div>
  );
}

function CompanyPicker({
  open,
  onOpenChange,
  current,
  field,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly current: CompanyId | null;
  readonly field: JobFieldId | null;
}): ReactNode {
  // a fresh body on every opening (the choice starts from the saved company)
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  return (
    <Sheet onOpenChange={onOpenChange} open={open} size="md" title={PROFILE_COPY.companyTitle}>
      <PickerBody current={current} field={field} key={session} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function PickerBody({ current, field, onDone }: { readonly current: CompanyId | null; readonly field: JobFieldId | null; readonly onDone: () => void }): ReactNode {
  const [choice, setChoice] = useState<CompanyId | null>(current);
  const [typed, setTyped] = useState("");
  // only companies with real jobs in the app (20 Nov 2026): the user's field first, then the rest by how many jobs they have
  const first = companyChoices(field);
  const others = companyChoices(null, 40).filter((id) => !first.includes(id));
  const matched = typed.trim() === "" ? null : matchCompany(typed);
  // a typed company that is not among the tiles joins the first row, chosen
  const extra = choice !== null && !first.includes(choice) && !others.includes(choice) ? [choice] : [];

  const save = () => {
    if (choice !== null && choice !== current) useAppStore.getState().setDreamCompany(choice);
    onDone();
  };

  const tile = (id: CompanyId) => (
    <Chip
      data-testid={TID.profile.companyOption(id)}
      icon={<CompanyMark company={getCompany(id)} size={16} />}
      key={id}
      onClick={() => setChoice(id)}
      selected={choice === id}
      size="sm"
    >
      {getCompany(id).short}
    </Chip>
  );

  return (
    <div className="flex flex-col gap-5 pt-1">
      <div className="flex flex-col gap-2">
        <p className="text-small font-semibold text-fg-2">{field ? PROFILE_COPY.companyYourField : PROFILE_COPY.companyBig}</p>
        <div className="flex flex-wrap gap-2">{[...first, ...extra].map(tile)}</div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-small font-semibold text-fg-2">{PROFILE_COPY.companyOthers}</p>
        <div className="flex flex-wrap gap-2">{others.map(tile)}</div>
      </div>
      <TextField
        data-testid={TID.profile.companyInput}
        hint={typed.trim() === "" ? undefined : matched ? PROFILE_COPY.companyFound(getCompany(matched).short) : PROFILE_COPY.companyNotFound}
        label={PROFILE_COPY.companyType}
        maxLength={60}
        onChange={(event) => {
          setTyped(event.target.value);
          const found = event.target.value.trim() === "" ? null : matchCompany(event.target.value);
          if (found) setChoice(found);
        }}
        value={typed}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
        <Button className="sm:min-w-32" data-testid={TID.profile.companySave} disabled={choice === null} onClick={save}>
          {PROFILE_COPY.save}
        </Button>
        <Button className="sm:min-w-28" data-testid={TID.profile.companyCancel} onClick={onDone} variant="secondary">
          {PROFILE_COPY.cancel}
        </Button>
      </div>
    </div>
  );
}
