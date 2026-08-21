"use client";

import * as React from "react";
import { formatCompactNumber, type PhaseCounts } from "@ci/shared";
import { getMessages } from "@/lib/i18n/de";
import { CreativeDrawer } from "./creative-drawer";
import { RunResults, type CreativeLite } from "./run-results";

/**
 * Client-Hülle der Ergebnisansicht: Tabs plus Detail-Drawer
 * (Transkript, Frames, Analyse, Feedback).
 */
export function ResultsShell({
  clientName,
  orgId,
  counts,
  videos,
  ads,
  reportTab,
}: {
  clientName: string;
  orgId: string;
  counts: PhaseCounts;
  videos: CreativeLite[];
  ads: CreativeLite[];
  reportTab?: React.ReactNode;
}) {
  const m = getMessages();
  const [selected, setSelected] = React.useState<CreativeLite | null>(null);

  const summary = [
    counts.collected != null
      ? m.run.counts.collected(formatCompactNumber(counts.collected))
      : null,
    counts.relevant != null
      ? m.run.counts.relevant(formatCompactNumber(counts.relevant))
      : null,
    counts.analyzed != null
      ? m.run.counts.analyzed(formatCompactNumber(counts.analyzed))
      : null,
  ].filter(Boolean);

  return (
    <div>
      <section className="pb-10">
        <p className="text-[13px] font-medium text-ink-2">
          {m.run.eyebrow} · {clientName}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight">
          Ergebnis.
        </h1>
        {summary.length > 0 ? (
          <p className="tnum mt-3 text-[15px] text-ink-2">
            {summary.join(" → ")}
          </p>
        ) : null}
      </section>
      <RunResults
        videos={videos}
        ads={ads}
        onOpen={setSelected}
        reportTab={reportTab}
      />
      <CreativeDrawer
        item={selected}
        orgId={orgId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
