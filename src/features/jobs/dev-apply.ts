// Owner: jobs. DEVELOPMENT ONLY: a stand-in for the advisor dispatcher's `apply` action (ARCHITECTURE 9.2), so the jobs
// screen's half of «دليلك» applying can be recorded and checked on its own. It is never called by the product: only a
// QA script calls `window.__dalilakJobs.advisorApply(jobId)` (or `.stop()`), and it is not installed in a production
// build. It does what the dispatcher does around the run: startApplyRun, hold("advisor-apply"), the busy flag and the
// in-flight marker, and on the result it releases and clears everything.
import { useAppStore, useUi } from "@/lib/store";
import type { JobId } from "@/lib/types";

declare global {
  interface Window {
    __dalilakJobs?: { advisorApply(jobId: JobId): number | null; stop(): void };
  }
}

export function installDevApply(): void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined" || window.__dalilakJobs) return;
  window.__dalilakJobs = {
    advisorApply(jobId) {
      const ui = useUi.getState();
      const runId = ui.startApplyRun(jobId);
      if (runId === null) return null;
      ui.hold("advisor-apply");
      ui.setAdvisorBusy(true);
      useAppStore.getState().setApplyInFlight(jobId);
      const unsubscribe = useUi.subscribe((state) => {
        const run = state.applyRun;
        if (run === null || run.id !== runId || run.result === null) return;
        unsubscribe();
        const after = useUi.getState();
        after.release("advisor-apply");
        after.setAdvisorBusy(false);
        useAppStore.getState().setApplyInFlight(null);
        after.clearApplyRun();
      });
      return runId;
    },
    stop() {
      useUi.getState().requestApplyStop();
    },
  };
}
