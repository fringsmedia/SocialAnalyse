"use client";

import * as React from "react";
import { formatCompactNumber, type CostBreakdown } from "@ci/shared";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function usd(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

interface CostRow {
  label: string;
  detail: string | null;
  usd: number;
}

/** Kosten-Dashboard pro Run aus analysis_runs.cost_breakdown. */
export function CostSection({ breakdown }: { breakdown: CostBreakdown }) {
  const m = getMessages();

  const rows: CostRow[] = [];
  const anthropic = breakdown.anthropic ?? {};
  const modelLabel: Record<string, string> = {
    haiku: m.cost.entries.haiku,
    sonnet: m.cost.entries.sonnet,
    opus: m.cost.entries.opus,
  };
  for (const key of ["haiku", "sonnet", "opus"] as const) {
    const entry = anthropic[key];
    if (!entry) continue;
    rows.push({
      label: modelLabel[key]!,
      detail: m.cost.tokens(
        formatCompactNumber(entry.inputTokens ?? 0),
        formatCompactNumber(entry.outputTokens ?? 0),
      ),
      usd: entry.usd ?? 0,
    });
  }
  if (breakdown.openai) {
    rows.push({
      label: m.cost.entries.whisper,
      detail: breakdown.openai.whisperSeconds
        ? m.cost.seconds(formatCompactNumber(breakdown.openai.whisperSeconds))
        : null,
      usd: breakdown.openai.usd ?? 0,
    });
  }
  if (breakdown.apify) {
    rows.push({
      label: m.cost.entries.apify,
      detail: breakdown.apify.events
        ? m.cost.events(formatCompactNumber(breakdown.apify.events))
        : null,
      usd: breakdown.apify.usd ?? 0,
    });
  }

  const total = rows.reduce((sum, row) => sum + row.usd, 0);

  return (
    <Card className="p-8">
      <div className="flex items-baseline justify-between gap-4">
        <Label>{m.cost.title}</Label>
        <span className="tnum text-[2rem] font-medium leading-none tracking-tight">
          {usd(total)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-[15px] text-ink-2">{m.cost.empty}</p>
      ) : (
        <dl className="mt-6 space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 text-[15px]"
            >
              <dt>
                <span className="font-medium">{row.label}</span>
                {row.detail ? (
                  <span className="tnum text-[13px] text-ink-2">
                    {" "}
                    · {row.detail}
                  </span>
                ) : null}
              </dt>
              <dd className="tnum font-medium">{usd(row.usd)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
