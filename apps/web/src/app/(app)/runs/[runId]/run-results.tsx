"use client";

import * as React from "react";
import { ArrowSquareOut, Play } from "@phosphor-icons/react/dist/ssr";
import { formatCompactNumber } from "@ci/shared";
import { getMessages } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Serialisierbare Creative-Sicht für die Ergebnis-Tabs. */
export interface CreativeLite {
  id: string;
  source: "meta_ad" | "tiktok" | "instagram";
  url: string;
  platforms: string[];
  caption: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  category: "core" | "adjacent" | "foreign" | null;
  performance_score: number | null;
  breakdown: Record<string, unknown>;
  metrics: Record<string, unknown>;
  account_handle: string | null;
  page_name: string | null;
  headline: string | null;
  /** Phase 3: eine Zeile "Warum performt das". */
  why_it_works: string | null;
  has_analysis: boolean;
}

type CategoryFilter = "all" | "core" | "adjacent" | "foreign";

function numOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function outlierLabel(factor: number): string {
  return factor >= 10 ? factor.toFixed(0) : factor.toFixed(1).replace(".", ",");
}

function CategoryChips({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}) {
  const m = getMessages();
  return (
    <div className="flex flex-wrap gap-2">
      {(["all", "core", "adjacent", "foreign"] as const).map((cat) => (
        <button
          key={cat}
          type="button"
          aria-pressed={value === cat}
          onClick={() => onChange(cat)}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Chip selected={value === cat}>{m.results.filterCategory[cat]}</Chip>
        </button>
      ))}
    </div>
  );
}

export function VideoGrid({
  items,
  onOpen,
}: {
  items: CreativeLite[];
  onOpen?: (item: CreativeLite) => void;
}) {
  const m = getMessages();
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const outlier = numOf(item.breakdown.outlier);
        const plays = numOf(item.metrics.plays);
        const er = numOf(item.breakdown.engagement_rate);
        const inner = (
          <>
            <div className="relative aspect-[9/16] overflow-hidden rounded-(--radius-thumb) bg-surface-2">
              {item.thumbnail_url ? (
                // Remote-CDN-Thumbnails (Ingestion nach Storage: gezielt in ANALYZE)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail_url}
                  alt={item.caption ?? ""}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
                    <Play size={18} weight="fill" />
                  </span>
                </div>
              )}
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pr-3">
                {item.performance_score != null ? (
                  <Badge>{Math.round(item.performance_score)}</Badge>
                ) : null}
                {outlier >= 2 ? (
                  <Badge variant="accent">{outlierLabel(outlier)}×</Badge>
                ) : null}
              </div>
            </div>
            <div className="mt-2.5 space-y-1">
              <p className="line-clamp-1 text-sm font-medium">
                {item.why_it_works ??
                  item.caption ??
                  (item.account_handle ? `@${item.account_handle}` : item.source)}
              </p>
              <p className="tnum text-[13px] text-ink-2">
                {plays > 0 ? m.results.views(formatCompactNumber(plays)) : item.source}
                {er > 0
                  ? ` · ${m.results.engagement(`${(er * 100).toFixed(1).replace(".", ",")} %`)}`
                  : ""}
              </p>
            </div>
          </>
        );

        const className =
          "group block rounded-(--radius-thumb) text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
        return onOpen ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className={className}
          >
            {inner}
          </button>
        ) : (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={className}
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export function AdGrid({
  items,
  onOpen,
}: {
  items: CreativeLite[];
  onOpen?: (item: CreativeLite) => void;
}) {
  const m = getMessages();
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item) => {
        const days = Math.round(numOf(item.breakdown.longevity_days));
        const reach = numOf(item.breakdown.eu_reach);
        const variants = numOf(item.breakdown.variant_count);
        const body = (
          <Card
            className={cn(
              "flex h-full flex-col gap-3 p-6 transition-colors duration-300",
              "group-hover:bg-[#fbfbfa]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] font-medium text-ink-2">
                {item.page_name ?? "Meta Ad"}
              </span>
              <div className="flex shrink-0 gap-1.5">
                {item.performance_score != null ? (
                  <Badge>{Math.round(item.performance_score)}</Badge>
                ) : null}
              </div>
            </div>
            {item.headline ? (
              <h3 className="line-clamp-2 text-lg font-medium leading-snug tracking-tight">
                {item.headline}
              </h3>
            ) : null}
            {item.why_it_works ? (
              <p className="line-clamp-2 text-[15px] leading-relaxed">
                {item.why_it_works}
              </p>
            ) : null}
            {item.caption ? (
              <p className="line-clamp-3 text-[15px] leading-relaxed text-ink-2">
                {item.caption}
              </p>
            ) : null}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
              {days > 0 ? (
                <Badge variant="neutral">{m.results.runtimeDays(days)}</Badge>
              ) : null}
              {variants > 1 ? (
                <Badge variant="neutral">{variants} Varianten</Badge>
              ) : null}
              {reach > 0 ? (
                <Badge variant="neutral">
                  {m.results.reach(formatCompactNumber(reach))}
                </Badge>
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
                {item.platforms.join(" · ")}
                <ArrowSquareOut size={13} />
              </span>
            </div>
          </Card>
        );
        const className =
          "group block h-full rounded-(--radius-card) text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
        return onOpen ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className={className}
          >
            {body}
          </button>
        ) : (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={className}
          >
            {body}
          </a>
        );
      })}
    </div>
  );
}

export function RunResults({
  videos,
  ads,
  onOpen,
  reportTab,
}: {
  videos: CreativeLite[];
  ads: CreativeLite[];
  onOpen?: (item: CreativeLite) => void;
  /** Phase 4: Pattern-Report als drittes Tab. */
  reportTab?: React.ReactNode;
}) {
  const m = getMessages();
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [videoSort, setVideoSort] = React.useState<"score" | "outlier" | "recent">(
    "score",
  );
  const [adSort, setAdSort] = React.useState<"score" | "longevity" | "recent">(
    "score",
  );

  const byCategory = (item: CreativeLite) =>
    category === "all" || item.category === category;

  const sortedVideos = [...videos].filter(byCategory).sort((a, b) => {
    if (videoSort === "outlier") {
      return numOf(b.breakdown.outlier) - numOf(a.breakdown.outlier);
    }
    if (videoSort === "recent") {
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    }
    return (b.performance_score ?? 0) - (a.performance_score ?? 0);
  });

  const sortedAds = [...ads].filter(byCategory).sort((a, b) => {
    if (adSort === "longevity") {
      return numOf(b.breakdown.longevity_days) - numOf(a.breakdown.longevity_days);
    }
    if (adSort === "recent") {
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    }
    return (b.performance_score ?? 0) - (a.performance_score ?? 0);
  });

  const defaultTab = videos.length > 0 ? "videos" : "ads";

  return (
    <Tabs defaultValue={defaultTab}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="videos">
            {m.results.tabs.videos}
            <span className="tnum text-[13px] text-ink-2">{videos.length}</span>
          </TabsTrigger>
          <TabsTrigger value="ads">
            {m.results.tabs.ads}
            <span className="tnum text-[13px] text-ink-2">{ads.length}</span>
          </TabsTrigger>
          {reportTab ? (
            <TabsTrigger value="report">{m.results.tabs.report}</TabsTrigger>
          ) : null}
        </TabsList>
        <CategoryChips value={category} onChange={setCategory} />
      </div>

      <TabsContent value="videos">
        <div className="mb-6 flex items-center justify-between gap-4">
          <span className="tnum text-[13px] font-medium text-ink-2">
            {m.results.itemsCount(sortedVideos.length)}
          </span>
          <Select
            value={videoSort}
            onValueChange={(v) => setVideoSort(v as typeof videoSort)}
          >
            <SelectTrigger aria-label={m.results.sort.label} className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">{m.results.sort.score}</SelectItem>
              <SelectItem value="outlier">{m.results.sort.outlier}</SelectItem>
              <SelectItem value="recent">{m.results.sort.recent}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sortedVideos.length === 0 ? (
          <Card className="grid place-items-center px-8 py-16 text-center text-[15px] text-ink-2">
            {m.results.emptyVideos}
          </Card>
        ) : (
          <VideoGrid items={sortedVideos} onOpen={onOpen} />
        )}
      </TabsContent>

      <TabsContent value="ads">
        <div className="mb-6 flex items-center justify-between gap-4">
          <span className="tnum text-[13px] font-medium text-ink-2">
            {m.results.itemsCount(sortedAds.length)}
          </span>
          <Select
            value={adSort}
            onValueChange={(v) => setAdSort(v as typeof adSort)}
          >
            <SelectTrigger aria-label={m.results.sort.label} className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">{m.results.sort.score}</SelectItem>
              <SelectItem value="longevity">{m.results.sort.longevity}</SelectItem>
              <SelectItem value="recent">{m.results.sort.recent}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sortedAds.length === 0 ? (
          <Card className="grid place-items-center px-8 py-16 text-center text-[15px] text-ink-2">
            {m.results.emptyAds}
          </Card>
        ) : (
          <AdGrid items={sortedAds} onOpen={onOpen} />
        )}
      </TabsContent>

      {reportTab ? <TabsContent value="report">{reportTab}</TabsContent> : null}
    </Tabs>
  );
}
