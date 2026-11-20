"use client";

// /dev/brain: the provider backup chain (development page; Latin labels are for the team, not the product).
// Reads GET /api/brain/log every 2 s: each slot (gemini-1 → gemini-2 → anthropic → the built-in brain) with its model,
// env variable NAMES, cooldown and last failure, then the last 20 replies: who answered, how fast, after which misses.
// No key is ever sent to this page.
import { useCallback, useEffect, useState } from "react";

import type { ReplyRecord } from "@/lib/brain/server/chain";
import type { SlotState } from "@/lib/brain/server/provider";
import type { BrainStatus } from "@/lib/brain/protocol";

interface Log {
  readonly status: BrainStatus;
  readonly chain: { readonly aiProvider: string; readonly slots: readonly SlotState[] };
  readonly replies: readonly ReplyRecord[];
}

const SKIPPED: Record<NonNullable<SlotState["skipped"]>, string> = {
  no_key: "no key: skipped",
  ai_provider: "left out by AI_PROVIDER",
  same_as_gemini_1: "same key and model as gemini-1: left out",
};

function seconds(ms: number): string {
  return `${Math.ceil(ms / 1000)} s`;
}

function time(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString("en-GB");
}

function slotLine(s: SlotState): string {
  if (!s.active) return s.skipped ? SKIPPED[s.skipped] : "off";
  if (s.coolingDownMs > 0) return `resting ${seconds(s.coolingDownMs)}`;
  return "ready";
}

export default function DevBrain() {
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/brain/log", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setLog((await response.json()) as Log);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    if (!live) return;
    const timer = setInterval(() => void load(), 2_000);
    return () => clearInterval(timer);
  }, [live, load]);

  return (
    <main className="mx-auto max-w-4xl p-10" dir="ltr">
      <h1 className="text-2xl font-bold">Dalilak · brain chain</h1>
      <p className="mt-2 text-sm text-ink-3">
        Tried in order within one reply: gemini-1 → gemini-2 → anthropic → the built-in brain. Each slot rests 60 s after a failure (a lone timeout
        does not count; two within 2 minutes do).
      </p>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <button type="button" className="rounded border border-line-strong px-3 py-1" onClick={() => setLive((v) => !v)}>
          {live ? "Pause" : "Resume"}
        </button>
        <button type="button" className="rounded border border-line-strong px-3 py-1" onClick={() => void load()}>
          Refresh
        </button>
        {log ? (
          <span className="text-ink-3">
            AI_PROVIDER={log.chain.aiProvider} · mode {log.status.mode} · {log.status.configured ? `first ready: ${log.status.provider ?? "none"}` : "no provider configured"}
          </span>
        ) : null}
        {error ? <span className="text-accent-ink">{error}</span> : null}
      </div>

      <h2 className="mt-8 text-lg font-bold">Slots</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-3">
            <th className="py-1 pr-4">slot</th>
            <th className="py-1 pr-4">model</th>
            <th className="py-1 pr-4">env</th>
            <th className="py-1 pr-4">state</th>
            <th className="py-1">last failure</th>
          </tr>
        </thead>
        <tbody>
          {log?.chain.slots.map((s) => (
            <tr key={s.slot} className="border-b border-line">
              <td className="py-1 pr-4 font-mono">{s.slot}</td>
              <td className="py-1 pr-4 font-mono">{s.model}</td>
              <td className="py-1 pr-4 font-mono text-ink-3">
                {s.keyEnv} · {s.modelEnv}
              </td>
              <td className="py-1 pr-4">{slotLine(s)}</td>
              <td className="py-1">{s.lastFailure ? `${s.lastFailure.failure}, ${seconds(s.lastFailure.agoMs)} ago` : "none"}</td>
            </tr>
          ))}
          <tr>
            <td className="py-1 pr-4 font-mono">local</td>
            <td className="py-1 pr-4 text-ink-3" colSpan={4}>
              the built-in brain: always answers
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-8 text-lg font-bold">Last replies</h2>
      {log && log.replies.length === 0 ? <p className="mt-2 text-sm text-ink-3">No model reply since the server started.</p> : null}
      <ol className="mt-2 grid gap-1 font-mono text-sm">
        {log?.replies.map((r, i) => (
          <li key={`${r.at}-${i}`} className="border-b border-line py-1">
            <span className="text-ink-3">{time(r.at)}</span> {r.task} · <b>{r.by === "local" ? "built-in brain" : r.by}</b>
            {r.model ? ` (${r.model})` : ""} · {r.ms} ms
            {r.noProvider ? <span className="text-ink-3"> · no provider configured</span> : null}
            {r.misses.length > 0 ? (
              <span className="text-ink-3"> · after {r.misses.map((m) => `${m.slot} ${m.why}${m.ms > 0 ? ` ${m.ms} ms` : ""}`).join(", ")}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
