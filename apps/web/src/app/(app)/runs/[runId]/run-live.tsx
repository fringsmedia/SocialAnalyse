"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "@phosphor-icons/react/dist/ssr";
import type { Tables } from "@ci/db";
import { formatCompactNumber, type PhaseCounts, type RunStatus } from "@ci/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMessages } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { cancelRunAction } from "./actions";

type RunRow = Tables<"analysis_runs">;

const PIPELINE_PHASES = [
  "collect",
  "filter",
  "score",
  "analyze",
  "synthesize",
] as const;

type PipelinePhase = (typeof PIPELINE_PHASES)[number];

/** Aktive Pipeline-Phase je Run-Status (queued zählt als "vor collect"). */
const STATUS_PHASE: Partial<Record<RunStatus, PipelinePhase>> = {
  collecting: "collect",
  filtering: "filter",
  scoring: "score",
  analyzing: "analyze",
  synthesizing: "synthesize",
};

/** Grobe Dauer je Phase in Minuten für die Restzeit-Anzeige. */
const PHASE_MINUTES: Record<PipelinePhase, number> = {
  collect: 8,
  filter: 4,
  score: 1,
  analyze: 12,
  synthesize: 3,
};

const ACTIVE_STATUSES: RunStatus[] = [
  "queued",
  "collecting",
  "filtering",
  "scoring",
  "analyzing",
  "synthesizing",
];

function phaseState(
  phase: PipelinePhase,
  status: RunStatus,
): "done" | "active" | "pending" {
  if (status === "completed") return "done";
  const active = STATUS_PHASE[status];
  const activeIndex = active ? PIPELINE_PHASES.indexOf(active) : -1;
  const index = PIPELINE_PHASES.indexOf(phase);
  if (activeIndex === -1) return "pending";
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "active";
  return "pending";
}

export function RunLive({
  initialRun,
  clientName,
}: {
  initialRun: RunRow;
  clientName: string;
}) {
  const m = getMessages();
  const router = useRouter();
  const [run, setRun] = React.useState<RunRow>(initialRun);
  const [pending, startTransition] = React.useTransition();

  // Sobald der Run abgeschlossen ist, serverseitig neu rendern –
  // die Seite wechselt dann zur Ergebnisansicht.
  React.useEffect(() => {
    if (run.status === "completed" && initialRun.status !== "completed") {
      router.refresh();
    }
  }, [run.status, initialRun.status, router]);

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`run-${initialRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analysis_runs",
          filter: `id=eq.${initialRun.id}`,
        },
        (payload) => setRun(payload.new as RunRow),
      )
      .subscribe();

    // Fallback-Poll, falls Realtime (z. B. lokal) nicht durchkommt.
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("analysis_runs")
        .select("*")
        .eq("id", initialRun.id)
        .single();
      if (data) setRun(data);
    }, 7000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [initialRun.id]);

  const status = run.status as RunStatus;
  const counts = (run.phase_counts ?? {}) as PhaseCounts;
  const errors = Array.isArray(run.error_log)
    ? (run.error_log as Array<{ at?: string; message?: string; detail?: string }>)
    : [];

  const isActive = ACTIVE_STATUSES.includes(status);
  const activePhase = STATUS_PHASE[status];
  const remainingMinutes = activePhase
    ? PIPELINE_PHASES.slice(PIPELINE_PHASES.indexOf(activePhase)).reduce(
        (sum, p) => sum + PHASE_MINUTES[p],
        0,
      )
    : status === "queued"
      ? Object.values(PHASE_MINUTES).reduce((a, b) => a + b, 0)
      : null;

  const headline =
    status === "completed"
      ? m.run.completedText
      : status === "failed"
        ? m.run.failedText
        : status === "cancelled"
          ? m.run.cancelledText
          : status === "queued"
            ? m.run.queuedText
            : `${m.runStatusLabels[status]} läuft …`;

  return (
    <div className="space-y-5">
      <section className="pb-4">
        <p className="text-[13px] font-medium text-ink-2">
          {m.run.eyebrow} · {clientName}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight">
            {headline}
          </h1>
          <div className="flex items-center gap-3">
            {isActive && remainingMinutes ? (
              <Badge variant="neutral">{m.run.remaining(remainingMinutes)}</Badge>
            ) : null}
            {isActive ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await cancelRunAction(run.id);
                  })
                }
              >
                <X size={14} weight="bold" />
                {m.run.cancel}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Card className="p-8">
        <div className="grid grid-cols-3 gap-8">
          <Stat
            value={
              counts.collected != null
                ? formatCompactNumber(counts.collected)
                : "–"
            }
            label="gesammelt"
          />
          <Stat
            value={
              counts.relevant != null
                ? formatCompactNumber(counts.relevant)
                : "–"
            }
            label="relevant"
          />
          <Stat
            value={
              counts.analyzed != null
                ? formatCompactNumber(counts.analyzed)
                : "–"
            }
            label="analysiert"
          />
        </div>
      </Card>

      <Card className="p-8">
        <ol className="space-y-5">
          {/* Profil ist beim Run-Start immer abgeschlossen. */}
          <li className="flex items-center gap-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-white">
              <Check size={13} weight="bold" />
            </span>
            <span className="text-[15px] font-medium">{m.run.phases.profile}</span>
          </li>
          {PIPELINE_PHASES.map((phase) => {
            const state = phaseState(phase, status);
            return (
              <li key={phase} className="flex items-center gap-4">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    state === "done" && "bg-accent text-white",
                    state === "active" && "bg-ink text-white",
                    state === "pending" && "bg-surface-2",
                  )}
                >
                  {state === "done" ? (
                    <Check size={13} weight="bold" />
                  ) : state === "active" ? (
                    <span className="size-2 animate-pulse rounded-full bg-white" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[15px] font-medium",
                    state === "pending" && "text-ink-2",
                  )}
                >
                  {m.run.phases[phase]}
                </span>
                {phase === "collect" && counts.collected != null ? (
                  <span className="tnum ml-auto text-[13px] font-medium text-ink-2">
                    {m.run.counts.collected(formatCompactNumber(counts.collected))}
                  </span>
                ) : null}
                {phase === "filter" && counts.relevant != null ? (
                  <span className="tnum ml-auto text-[13px] font-medium text-ink-2">
                    {m.run.counts.relevant(formatCompactNumber(counts.relevant))}
                  </span>
                ) : null}
                {phase === "analyze" && counts.analyzed != null ? (
                  <span className="tnum ml-auto text-[13px] font-medium text-ink-2">
                    {m.run.counts.analyzed(formatCompactNumber(counts.analyzed))}
                  </span>
                ) : null}
              </li>
            );
          })}
          <li className="flex items-center gap-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2" />
            <span className="text-[15px] font-medium text-ink-2">
              {m.run.phases.generate}
            </span>
            <span className="ml-auto text-[13px] font-medium text-ink-3">
              {m.run.generateOnDemand}
            </span>
          </li>
        </ol>
      </Card>

      {errors.length > 0 ? (
        <Card className="p-8">
          <p className="text-[13px] font-medium text-ink-2">
            {m.run.errorsTitle}
          </p>
          <ul className="mt-4 space-y-3">
            {errors.map((entry, i) => (
              <li key={i} className="text-[13px] leading-relaxed">
                <span className="font-medium">{entry.message}</span>
                {entry.detail ? (
                  <span className="text-ink-2"> – {entry.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
