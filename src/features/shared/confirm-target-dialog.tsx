"use client";
// Owner: shell. The «اجعلها هدفي» confirmation of spec 3.8, shared by /jobs/[id], the CV results (3.6) and the map's
// branch cards at 100% (3.4): title «تغيير الهدف؟», body «سيُعاد رسم مسارك نحو «{title}». تقدّمك في المهارات محفوظ.»,
// buttons «غيّر الهدف» (data-testid `job-set-target-confirm`) and «إلغاء» (`target-confirm-cancel`); container
// `target-confirm-dialog`. On confirm: store.setTarget(jobId), toast «هدفك الآن: {title}» (copy targetChangedToast),
// close, then onConfirmed(). Changing the target pays no XP (the store decides; the first target is set at the reveal).
// It is the design system's modal Sheet: a bottom sheet on phones, centred from 1024 px, focus trapped and returned.
import type { ReactNode } from "react";

import { Sheet } from "@/components/motion";
import { Button, toast } from "@/components/ui";
import { targetChangedToast } from "@/lib/copy";
import { getJob } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { SHARED_TID, TID } from "@/lib/testids";
import type { JobId } from "@/lib/types";

export function ConfirmTargetDialog(props: {
  readonly jobId: JobId;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirmed?: () => void;
}): ReactNode {
  const { jobId, open, onOpenChange, onConfirmed } = props;
  const title = getJob(jobId).title;

  const confirm = () => {
    useAppStore.getState().setTarget(jobId);
    toast({ title: targetChangedToast(jobId), tone: "ok" });
    onOpenChange(false);
    onConfirmed?.();
  };

  return (
    <Sheet
      description={
        <>
          سيُعاد رسم مسارك نحو «<bdi>{title}</bdi>». تقدّمك في المهارات محفوظ.
        </>
      }
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
          <Button className="sm:min-w-36" data-testid={TID.job.setTargetConfirm} onClick={confirm}>
            غيّر الهدف
          </Button>
          <Button className="sm:min-w-28" data-testid={SHARED_TID.confirmTargetCancel} onClick={() => onOpenChange(false)} variant="secondary">
            إلغاء
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      size="sm"
      testId={SHARED_TID.confirmTargetDialog}
      title="تغيير الهدف؟"
    />
  );
}
