"use client";
// Owner: profile. The avatar picker of spec 3.13: a dialog titled «اختر صورتك» with the twelve avatars and «حفظ» /
// «إلغاء»; saving shows the toast «تم تحديث صورتك.» and the new avatar appears at once everywhere (the user chip, the
// leaderboard, the advisor thread read the same store field). It is the design system's Sheet: a bottom sheet on phones,
// centred from 1024 px, focus trapped and returned to «غيّر الصورة».
// The twelve sit in three rows of four, the cast's own order (four neutral figures, four women, four men), with no labels:
// the rows simply let anyone find a face. It is a radio group: arrows move the choice, the selection ring is ONE element
// that glides between faces (shared layoutId, playbook 3.11).
import { LayoutGroup, motion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import { AVATARS, Avatar, type AvatarId } from "@/components/avatars";
import { Sheet } from "@/components/motion";
import { Button, cn, toast } from "@/components/ui";
import { TOAST_COPY } from "@/lib/copy";
import { spring } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { TID } from "@/lib/testids";

import { PROFILE_COPY } from "./copy";

export function AvatarPicker({ open, current, onOpenChange }: { readonly open: boolean; readonly current: AvatarId; readonly onOpenChange: (open: boolean) => void }): ReactNode {
  // A fresh body on every opening (so the choice starts from the saved avatar), kept mounted while the sheet closes.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  // Focus starts on the chosen face (the radio group's tab stop), not on the close button.
  const chosenRef = useRef<HTMLButtonElement | null>(null);
  return (
    <Sheet initialFocus={chosenRef} onOpenChange={onOpenChange} open={open} size="md" title={PROFILE_COPY.pickerTitle}>
      <PickerBody chosenRef={chosenRef} current={current} key={session} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function PickerBody({
  current,
  onDone,
  chosenRef,
}: {
  readonly current: AvatarId;
  readonly onDone: () => void;
  readonly chosenRef: RefObject<HTMLButtonElement | null>;
}): ReactNode {
  const [choice, setChoice] = useState<AvatarId>(current);
  const groupId = useId();
  const buttons = useRef(new Map<AvatarId, HTMLButtonElement>());

  const save = () => {
    if (choice !== current) {
      useAppStore.getState().setAvatar(choice);
      toast({ title: TOAST_COPY.avatarSaved, tone: "ok" });
    }
    onDone();
  };

  // Arrow keys move the choice (and the focus) along the reading order; in Arabic the left arrow goes forward.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: 1, ArrowDown: 4, ArrowRight: -1, ArrowUp: -4 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const i = AVATARS.findIndex((a) => a.id === choice);
    const next = AVATARS[(i + step + AVATARS.length) % AVATARS.length];
    if (!next) return;
    setChoice(next.id);
    buttons.current.get(next.id)?.focus();
  };

  return (
    <div className="flex flex-col gap-6 pt-1">
      <LayoutGroup id={groupId}>
        <div aria-label={PROFILE_COPY.pickerTitle} className="grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-4" onKeyDown={onKeyDown} role="radiogroup">
          {AVATARS.map((avatar) => {
            const selected = avatar.id === choice;
            return (
              <button
                aria-checked={selected}
                aria-label={avatar.label}
                className={cn(
                  "group relative grid aspect-square w-full place-items-center rounded-full outline-none",
                  "transition-[scale] duration-200 active:scale-[0.97] active:transition-none",
                  "focus-visible:focus-ring",
                )}
                data-state={selected ? "selected" : "idle"}
                data-testid={TID.profile.avatarOption(avatar.id)}
                key={avatar.id}
                onClick={() => setChoice(avatar.id)}
                ref={(el) => {
                  if (el) buttons.current.set(avatar.id, el);
                  else buttons.current.delete(avatar.id);
                  if (selected) chosenRef.current = el;
                }}
                role="radio"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {/* hover: a quiet ring in the hairline tone; the selection ring is the one ink ring that glides */}
                <span aria-hidden className="absolute inset-0 rounded-full border-2 border-transparent transition-colors duration-200 group-hover:border-border" />
                {selected ? (
                  <motion.span aria-hidden className="absolute inset-0 rounded-full border-[2.5px] border-fg" layoutId="avatar-choice" transition={spring.gentle} />
                ) : null}
                <span className="grid size-[82%] place-items-center">
                  <Avatar className="size-full! [&_svg]:size-full" id={avatar.id} size={84} />
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
        <Button className="sm:min-w-32" data-testid={TID.profile.avatarSave} onClick={save}>
          {PROFILE_COPY.save}
        </Button>
        <Button className="sm:min-w-28" data-testid={TID.profile.avatarCancel} onClick={onDone} variant="secondary">
          {PROFILE_COPY.cancel}
        </Button>
      </div>
    </div>
  );
}
