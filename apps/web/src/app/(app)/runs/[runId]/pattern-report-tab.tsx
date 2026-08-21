"use client";

import * as React from "react";
import { Play } from "@phosphor-icons/react/dist/ssr";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import type { CreativeLite } from "./run-results";

export interface ReportPatternView {
  title: string;
  description: string;
  frequency: number;
  why_it_works: string | null;
  transferability: string | null;
  examples: CreativeLite[];
}

export interface ReportSectionView {
  type: string;
  patterns: ReportPatternView[];
}

export interface ReportView {
  summary: string | null;
  sections: ReportSectionView[];
}

function ExampleThumb({
  item,
  onOpen,
}: {
  item: CreativeLite;
  onOpen: (item: CreativeLite) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={item.why_it_works ?? item.caption ?? undefined}
      className="group relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-(--radius-thumb) bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {item.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail_url}
          alt={item.caption ?? ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-ink-2">
          <Play size={16} weight="fill" />
        </span>
      )}
    </button>
  );
}

/**
 * Pattern-Report als lesbares Dokument: pro Muster Titel,
 * Häufigkeitsbalken (Koralle auf Hellgrau), Beschreibung und die
 * klickbaren Beispiel-Thumbnails direkt daneben.
 */
export function PatternReportTab({
  data,
  onOpen,
}: {
  data: ReportView;
  onOpen: (item: CreativeLite) => void;
}) {
  const m = getMessages();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {data.summary ? (
        <Card className="p-8">
          <p className="text-[13px] font-medium text-ink-2">
            {m.report.summaryTitle}
          </p>
          <p className="mt-3 max-w-[65ch] text-[17px] leading-relaxed">
            {data.summary}
          </p>
        </Card>
      ) : null}

      {data.sections.map((section) => {
        if (section.patterns.length === 0) return null;
        const maxFrequency = Math.max(
          ...section.patterns.map((p) => p.frequency),
          1,
        );
        return (
          <Card key={section.type} className="p-8">
            <h2 className="text-xl font-medium tracking-tight">
              {m.report.sections[section.type] ?? section.type}
            </h2>
            <div className="mt-6 space-y-10">
              {section.patterns.map((pattern) => (
                <div
                  key={pattern.title}
                  className="grid gap-5 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-[17px] font-medium tracking-tight">
                        {pattern.title}
                      </h3>
                      <span className="tnum text-[13px] font-medium text-ink-2">
                        {m.report.frequency(pattern.frequency)}
                      </span>
                    </div>
                    {/* Häufigkeitsbalken: dünn, Koralle auf Hellgrau */}
                    <div className="mt-2 h-1 w-full rounded-full bg-surface-2">
                      <div
                        className="h-1 rounded-full bg-accent transition-[width] duration-700 ease-(--ease-out-quart)"
                        style={{
                          width: `${Math.max((pattern.frequency / maxFrequency) * 100, 4)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-4 max-w-[65ch] text-[15px] leading-relaxed">
                      {pattern.description}
                    </p>
                    {pattern.why_it_works ? (
                      <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
                        <span className="font-medium text-ink">
                          {m.report.whyItWorks}:
                        </span>{" "}
                        {pattern.why_it_works}
                      </p>
                    ) : null}
                    {pattern.transferability ? (
                      <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
                        <span className="font-medium text-ink">
                          {m.report.transferability}:
                        </span>{" "}
                        {pattern.transferability}
                      </p>
                    ) : null}
                  </div>
                  {pattern.examples.length > 0 ? (
                    <div className="flex gap-2 md:pt-1">
                      {pattern.examples.slice(0, 3).map((example) => (
                        <ExampleThumb
                          key={example.id}
                          item={example}
                          onOpen={onOpen}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
