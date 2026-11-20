"use client";
// Owner: cv. The empty result (spec 3.6), in «دليلك»'s voice: nothing was saved and no XP was paid. «دليلك»'s still glyph
// stands where the empty state's drawing would be, because he is the one speaking.
import type { ReactNode } from "react";

import { DaleelGlyph } from "@/components/chat";
import { IconCv, IconEdit } from "@/components/icons";
import { Button, Card, EmptyState } from "@/components/ui";
import { PAGE_HEADINGS } from "@/lib/routes";
import { TID } from "@/lib/testids";

import { CV_COPY } from "./copy";

export function CvEmpty({ onEdit, onSample }: { readonly onEdit: () => void; readonly onSample: () => void }): ReactNode {
  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-gutter py-6 @min-[900px]/content:py-8">
      <h1 className="text-h1 lg:sr-only">{PAGE_HEADINGS.cv}</h1>
      <Card className="mx-auto w-full max-w-2xl" padding="none">
        <EmptyState
          action={
            <div className="flex flex-col-reverse gap-3 @min-[640px]/content:flex-row">
              <Button data-testid={TID.cv.emptyEdit} icon={<IconEdit size={20} />} iconPosition="start" onClick={onEdit} variant="secondary">
                {CV_COPY.emptyEdit}
              </Button>
              <Button data-testid={TID.cv.emptySample} icon={<IconCv size={20} />} iconPosition="start" onClick={onSample} variant="secondary">
                {CV_COPY.sample}
              </Button>
            </div>
          }
          art={<DaleelGlyph className="mb-2" framed size={48} state="idle" />}
          body={CV_COPY.emptyBody}
          className="py-12"
          testId={TID.cv.empty}
          title={CV_COPY.emptyTitle}
        />
      </Card>
    </div>
  );
}
