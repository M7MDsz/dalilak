"use client";
// Owner: signin. The sign-in column (spec 3.1): the logo, the headline, the supporting line, the saved accounts, the
// name field and «ابدأ رحلتك». Entry is by name only. A name that matches a saved account (after the 4.3
// normalisation) does not sign in: it offers «أكمل من حيث توقفت» or «ابدأ من جديد», so nobody lands in someone else's
// progress by accident. The store actions never navigate; this form does, with the ordinary page transition.
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type FormEvent } from "react";

import { Avatar } from "@/components/avatars";
import { Logo } from "@/components/brand";
import { IconArrowForward, IconCheckCircle, IconInfo } from "@/components/icons";
import { Collapse, useGo } from "@/components/motion";
import { Button, cn, ContourBackdrop, press, SampleTag, TextField } from "@/components/ui";
import { rise } from "@/lib/motion";
import { useAccounts, useAppStore } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { UserId } from "@/lib/types";

import { levelLabel, NAME_ERROR_COPY, SIGNIN_COPY } from "./copy";
import { StepMark } from "./step-mark";

/** Letters typed so far, as the store will count them (trimmed, inner spaces collapsed): the button wakes at 2. */
function typedLength(raw: string): number {
  return raw.trim().replace(/\s+/gu, " ").length;
}

export function SigninForm({ className }: { className?: string }) {
  const go = useGo();
  const accounts = useAccounts();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<UserId | null>(null);
  const leaving = useRef(false);
  const ready = typedLength(name) >= 2;

  const leave = (to: string) => {
    leaving.current = true;
    go(to);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (leaving.current) return;
    const store = useAppStore.getState();
    const found = store.findAccount(name);
    if (found !== null) {
      setError(null);
      setMatch(found);
      return;
    }
    const result = store.createAccount(name);
    if (result.ok) return leave(result.to);
    if (result.reason === "invalid") {
      setError(NAME_ERROR_COPY[result.error]);
      return;
    }
    setMatch(result.userId);
  };

  const resume = (userId: UserId) => {
    if (leaving.current) return;
    leave(useAppStore.getState().resumeAccount(userId).to);
  };

  const restart = () => {
    if (leaving.current) return;
    const result = useAppStore.getState().restartAccount(name);
    if (result.ok) return leave(result.to);
    if (result.reason === "invalid") {
      setMatch(null);
      setError(NAME_ERROR_COPY[result.error]);
    }
  };

  return (
    <section className={cn("relative isolate flex flex-col", className)}>
      {/* quiet terrain at the foot of the paper: the trail on the right starts somewhere down here */}
      <ContourBackdrop intensity="faint" summit={{ x: 0.02, y: 1.02 }} rings={14} seed={7} />

      <header className="flex items-center">
        <Logo size={36} />
      </header>

      <div className="flex w-full max-w-[27rem] flex-1 flex-col justify-center gap-7 py-8 lg:gap-8 lg:py-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-h1 text-balance lg:text-display">
            {SIGNIN_COPY.headlineLead} <StepMark>{SIGNIN_COPY.headlineStep}</StepMark>
          </h1>
          <p className="text-body text-balance text-fg-2 lg:text-[1.0625rem] lg:leading-[1.85]">{SIGNIN_COPY.support}</p>
        </div>

        {accounts.length > 0 ? (
          <section aria-labelledby="signin-accounts" className="flex flex-col gap-3">
            <h2 id="signin-accounts" className="text-small font-semibold text-fg-2">
              {SIGNIN_COPY.accountsHeading}
            </h2>
            <ul className="flex flex-wrap gap-2.5">
              {accounts.map((account, index) => (
                <li key={account.userId}>
                  <button
                    type="button"
                    data-testid={TID.signin.account(index)}
                    onClick={() => resume(account.userId)}
                    className={cn(
                      "wp-quiet inline-flex h-13 max-w-full items-center gap-2.5 rounded-full border-[1.5px] border-border-strong bg-surface ps-1.5 pe-4 text-start",
                      "transition-[border-color,scale,translate] duration-200 ease-out hover:border-fg",
                      press,
                    )}
                  >
                    <Avatar id={account.avatar} size={38} level={account.level} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[0.9375rem] leading-5 font-semibold text-fg">{account.name}</span>
                      <span className="text-small leading-5 text-fg-3">{levelLabel(account.level)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form data-testid={TID.signin.form} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <TextField
            label={SIGNIN_COPY.fieldLabel}
            size="lg"
            placeholder={SIGNIN_COPY.fieldPlaceholder}
            data-testid={TID.signin.name}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
              setMatch(null);
            }}
            error={error ? <span data-testid={TID.signin.error}>{error}</span> : undefined}
            autoFocus
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="go"
            name="name"
          />

          <Collapse open={match !== null}>
            <p className="flex items-start gap-2 pb-0.5 text-small font-medium text-fg-2">
              <IconInfo size={20} waypoint="off" className="mt-0.5 shrink-0 text-fg-3" />
              <span>{SIGNIN_COPY.matchNotice}</span>
            </p>
          </Collapse>

          <AnimatePresence mode="wait" initial={false}>
            {match === null ? (
              <motion.div key="submit" variants={rise} initial="hidden" animate="show" exit="exit">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  aria-disabled={!ready}
                  data-testid={TID.signin.submit}
                  icon={<IconArrowForward size={20} />}
                >
                  {SIGNIN_COPY.submit}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="match" variants={rise} initial="hidden" animate="show" exit="exit" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Button size="lg" className="px-5" data-testid={TID.signin.resume} onClick={() => resume(match)}>
                  {SIGNIN_COPY.resume}
                </Button>
                <Button size="lg" className="px-5" variant="secondary" data-testid={TID.signin.restart} onClick={restart}>
                  {SIGNIN_COPY.restart}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="flex items-center gap-2 text-small text-fg-3">
            <IconCheckCircle size={18} waypoint="muted" className="shrink-0" />
            <span>{SIGNIN_COPY.helper}</span>
          </p>
        </form>
      </div>

      <footer className="flex">
        <SampleTag className="h-auto min-h-6 whitespace-normal py-0.5 leading-5">{SIGNIN_COPY.footer}</SampleTag>
      </footer>
    </section>
  );
}
