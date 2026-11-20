"use client";
// Owner: cv. The input state of /cv (spec 3.6): drag a file onto the zone or pick one, paste the text, or press the sample
// button (its text writes itself into the paste area, `sample-type-on`); then «حلّل سيرتي». Errors sit under the drop
// zone (6.1 says which applies); a rejected file stays visible with its sentence. Phone: the drop zone is the button
// «اختر ملفاً»; the paste area and the sample button follow.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { IconArrowForward, IconCv, IconFile, IconLock, IconRetry, IconUpload, IconWarning } from "@/components/icons";
import { Button, cn, ContourBackdrop, TextArea } from "@/components/ui";
import type { CvErrorCode } from "@/lib/brain/protocol";
import { popIn, tween } from "@/lib/motion";
import { PAGE_HEADINGS } from "@/lib/routes";
import { TID } from "@/lib/testids";

import { Bidi } from "./bidi";
import { CV_COPY, CV_ERROR_COPY, fileChipLabel } from "./copy";
import { useFileDrag, type DragState } from "./use-file-drag";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function CvInput(props: {
  readonly file: File | null;
  /** The file was refused by the pre-check: it stays visible with its sentence, and the paste area stays open. */
  readonly fileRejected: boolean;
  readonly text: string;
  readonly typing: boolean;
  readonly error: CvErrorCode | null;
  readonly extracting: boolean;
  readonly canAnalyse: boolean;
  readonly showShortHint: boolean;
  readonly privacyModel: boolean;
  readonly pasteRef: RefObject<HTMLTextAreaElement | null>;
  readonly onFile: (file: File | null) => void;
  readonly onText: (text: string) => void;
  readonly onSample: () => void;
  readonly onAnalyse: () => void;
  readonly onRetry: () => void;
}): ReactNode {
  const { file, fileRejected, text, typing, error, extracting, canAnalyse, showShortHint, privacyModel, pasteRef } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useFileDrag(props.onFile, !extracting);

  // while the sample writes itself in, keep the newest line in view
  useEffect(() => {
    if (!typing) return;
    const el = pasteRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [typing, text, pasteRef]);

  const pick = () => inputRef.current?.click();

  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-gutter py-6 @min-[900px]/content:gap-7 @min-[900px]/content:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 lg:sr-only">{PAGE_HEADINGS.cv}</h1>
        <p className="max-w-2xl text-body text-fg-2">{CV_COPY.intro}</p>
      </header>

      <div className="grid gap-5 @min-[900px]/content:grid-cols-2 @min-[900px]/content:gap-6">
        {/* the drop zone (a button on a phone) and the errors under it */}
        <div className="flex flex-col gap-3">
          {/* label + zone use the paste field's own label style and gap (FieldShell), so the two boxes sit level */}
          <div className="flex flex-col gap-2">
            <p className="hidden text-small font-medium text-fg-2 @min-[900px]/content:block">{CV_COPY.dropLabel}</p>
            <div
              {...drag.zone}
              className={cn(
                "group/zone relative isolate flex flex-col overflow-hidden transition-[border-color,background-color] duration-200 ease-out",
                "@min-[640px]/content:min-h-[19rem] @min-[640px]/content:rounded-card @min-[640px]/content:border-[1.5px] @min-[640px]/content:border-dashed @min-[640px]/content:border-contour-line-2 @min-[640px]/content:bg-surface",
                "@min-[640px]/content:data-[drag=window]:border-border-strong",
                "@min-[640px]/content:data-[drag=zone]:border-solid @min-[640px]/content:data-[drag=zone]:border-fg @min-[640px]/content:data-[drag=zone]:bg-hover",
              )}
              data-drag={drag.state}
              data-testid={TID.cv.dropzone}
            >
              <div className="hidden @min-[640px]/content:contents">
                <ContourBackdrop intensity="faint" summit={{ x: 0.5, y: 0.42 }} />
              </div>
              <div className="relative flex flex-1 flex-col items-stretch gap-3 @min-[640px]/content:items-center @min-[640px]/content:justify-center @min-[640px]/content:px-8 @min-[640px]/content:py-10 @min-[640px]/content:text-center">
                <DropArt state={drag.state} />
                <p className="hidden text-h3 text-fg @min-[640px]/content:block">{CV_COPY.dropTitle}</p>
                <AnimatePresence initial={false} mode="popLayout">
                  {file ? (
                    <FileChip file={file} invalid={fileRejected} key="chip" onRemove={() => props.onFile(null)} />
                  ) : (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-stretch @min-[640px]/content:items-center"
                      exit={{ opacity: 0, transition: tween.exit }}
                      initial={{ opacity: 0 }}
                      key="pick"
                    >
                      <Button
                        className="w-full @min-[640px]/content:mt-1 @min-[640px]/content:w-auto"
                        disabled={extracting}
                        icon={<IconUpload size={20} />}
                        iconPosition="start"
                        onClick={pick}
                        variant="secondary"
                      >
                        {CV_COPY.chooseFile}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-small text-fg-3">
                  <Bidi text={CV_COPY.dropHint} />
                </p>
              </div>
              <input
                accept={ACCEPT}
                className="sr-only"
                data-testid={TID.cv.fileInput}
                onChange={(event) => {
                  const chosen = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (chosen) props.onFile(chosen);
                }}
                ref={inputRef}
                tabIndex={-1}
                type="file"
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {error ? <ErrorLine code={error} key={error} onRetry={props.onRetry} /> : null}
          </AnimatePresence>
        </div>

        {/* the paste area, and the sample right under it (its text writes itself in above the button) */}
        <div className="flex flex-col gap-3">
          <TextArea
            data-testid={TID.cv.paste}
            dir="auto"
            disabled={file !== null && !fileRejected}
            fieldClassName="@min-[900px]/content:min-h-[19rem]"
            hint={
              showShortHint ? (
                <span data-testid={TID.cv.pasteHint}>
                  {CV_COPY.pasteShort}
                </span>
              ) : undefined
            }
            label={CV_COPY.pasteLabel}
            onChange={(event) => props.onText(event.currentTarget.value)}
            placeholder={CV_COPY.pastePlaceholder}
            readOnly={typing}
            ref={pasteRef}
            rows={7}
            style={{ maxHeight: "12lh" }}
            value={text}
          />
          <div>
            <Button data-testid={TID.cv.sample} icon={<IconCv size={20} />} iconPosition="start" onClick={props.onSample} pressed={typing} variant="secondary">
              {CV_COPY.sample}
            </Button>
          </div>
        </div>
      </div>

      {/* the one primary action, and what happens to the text */}
      <div className="flex flex-col gap-4 border-t border-border pt-6 @min-[640px]/content:flex-row @min-[640px]/content:items-center @min-[640px]/content:gap-6">
        <Button
          className="w-full @min-[640px]/content:w-auto @min-[640px]/content:min-w-56"
          data-testid={TID.cv.analyse}
          disabled={!canAnalyse}
          icon={<IconArrowForward size={20} />}
          loading={extracting}
          onClick={props.onAnalyse}
          size="lg"
        >
          {CV_COPY.analyse}
        </Button>
        <p className="flex max-w-2xl items-start gap-2 text-small text-fg-3">
          <IconLock className="mt-0.5 shrink-0" size={18} waypoint="muted" />
          <span>
            {CV_COPY.privacy}
            {privacyModel ? ` ${CV_COPY.privacyModel}` : null}
          </span>
        </p>
      </div>
    </div>
  );
}

/** The zone's drawing: an open ring with the upload mark; it wakes when a file is over the window, lifts over the zone. */
function DropArt({ state }: { readonly state: DragState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative hidden size-[4.5rem] place-items-center rounded-full border-[1.5px] border-dashed border-border-strong bg-surface text-fg-2 transition-[border-color,color,translate] duration-200 ease-out @min-[640px]/content:grid",
        state !== "idle" && "border-solid text-fg",
        state === "zone" && "-translate-y-1 border-fg",
      )}
    >
      <IconUpload size={30} waypoint="muted" />
    </span>
  );
}

function FileChip({ file, invalid, onRemove }: { readonly file: File; readonly invalid: boolean; readonly onRemove: () => void }) {
  const label = fileChipLabel(file.name, file.size);
  return (
    <motion.div
      animate="show"
      className={cn(
        "inline-flex h-12 max-w-full items-center gap-2.5 self-stretch rounded-full border-[1.5px] bg-surface ps-4 pe-1.5 @min-[640px]/content:self-center",
        invalid ? "border-dashed border-warn-fg" : "border-fg",
      )}
      data-testid={TID.cv.fileChip}
      exit="exit"
      initial="hidden"
      variants={popIn}
    >
      <IconFile className={invalid ? "text-warn-fg" : "text-fg-2"} size={20} waypoint="muted" />
      <span className="min-w-0 flex-1 truncate text-small font-semibold text-fg">
        <bdi>{label.name}</bdi> · {label.size}
      </span>
      <Button onClick={onRemove} size="sm" variant="ghost">
        {CV_COPY.removeFile}
      </Button>
    </motion.div>
  );
}

function ErrorLine({ code, onRetry }: { readonly code: CvErrorCode; readonly onRetry: () => void }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-control bg-warn-soft px-4 py-3 @min-[640px]/content:flex-row @min-[640px]/content:items-center"
      data-testid={TID.cv.error}
      data-value={code}
      exit={{ opacity: 0, transition: tween.exit }}
      initial={{ opacity: 0, y: -4 }}
      role="alert"
      transition={tween.move}
    >
      <p className="flex flex-1 items-start gap-2 text-small font-medium text-warn-fg">
        <IconWarning className="mt-0.5 shrink-0" size={20} waypoint="off" />
        <span>
          <Bidi text={CV_ERROR_COPY[code]} />
        </span>
      </p>
      {code === "request_failed" ? (
        <Button className="self-start @min-[640px]/content:self-auto" data-testid={TID.cv.retry} icon={<IconRetry size={18} />} iconPosition="start" onClick={onRetry} size="sm" variant="secondary">
          {CV_COPY.retry}
        </Button>
      ) : null}
    </motion.div>
  );
}
