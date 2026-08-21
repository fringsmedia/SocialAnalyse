"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  ThumbsDown,
  ThumbsUp,
} from "@phosphor-icons/react/dist/ssr";
import { formatCompactNumber } from "@ci/shared";
import {
  creativeAnalysisSchema,
  type CreativeAnalysis,
} from "@ci/shared/prompts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMessages } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreativeLite } from "./run-results";

interface DetailState {
  loading: boolean;
  transcript: string | null;
  frameUrls: string[];
  analysis: CreativeAnalysis | null;
  verdict: "fits" | "does_not_fit" | null;
}

function numOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function MetaField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-[15px] leading-relaxed">{value}</p>
    </div>
  );
}

export function CreativeDrawer({
  item,
  orgId,
  onClose,
}: {
  item: CreativeLite | null;
  orgId: string;
  onClose: () => void;
}) {
  const m = getMessages();
  const [detail, setDetail] = React.useState<DetailState>({
    loading: true,
    transcript: null,
    frameUrls: [],
    analysis: null,
    verdict: null,
  });

  React.useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setDetail({
      loading: true,
      transcript: null,
      frameUrls: [],
      analysis: null,
      verdict: null,
    });

    (async () => {
      const supabase = createSupabaseBrowserClient();
      const [{ data: row }, { data: auth }] = await Promise.all([
        supabase
          .from("creative_analyses")
          .select("transcript, frame_paths, analysis")
          .eq("creative_id", item.id)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      let frameUrls: string[] = [];
      if (row?.frame_paths && row.frame_paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("creatives")
          .createSignedUrls(row.frame_paths, 3600);
        frameUrls = (signed ?? [])
          .map((s) => s.signedUrl)
          .filter((u): u is string => Boolean(u));
      }

      let verdict: DetailState["verdict"] = null;
      if (auth.user) {
        const { data: fb } = await supabase
          .from("feedback")
          .select("verdict")
          .eq("creative_id", item.id)
          .eq("user_id", auth.user.id)
          .maybeSingle();
        verdict = (fb?.verdict as DetailState["verdict"]) ?? null;
      }

      const parsed = row?.analysis
        ? creativeAnalysisSchema.safeParse(row.analysis)
        : null;

      if (!cancelled) {
        setDetail({
          loading: false,
          transcript: row?.transcript ?? null,
          frameUrls,
          analysis: parsed?.success ? parsed.data : null,
          verdict,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  async function giveFeedback(verdict: "fits" | "does_not_fit") {
    if (!item) return;
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (detail.verdict === verdict) {
      await supabase
        .from("feedback")
        .delete()
        .eq("creative_id", item.id)
        .eq("user_id", user.id);
      setDetail((d) => ({ ...d, verdict: null }));
    } else {
      await supabase.from("feedback").upsert(
        {
          organization_id: orgId,
          creative_id: item.id,
          user_id: user.id,
          verdict,
        },
        { onConflict: "creative_id,user_id" },
      );
      setDetail((d) => ({ ...d, verdict }));
    }
  }

  if (!item) return null;

  const outlier = numOf(item.breakdown.outlier);
  const plays = numOf(item.metrics.plays);
  const analysis = detail.analysis;

  return (
    <Drawer
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item.headline ?? item.caption ?? item.id}
    >
      <div className="space-y-8 pb-4">
        {/* Kopf: Quelle, Scores, Original-Link */}
        <div className="space-y-4 pr-10">
          <div className="flex flex-wrap items-center gap-2">
            {item.performance_score != null ? (
              <Badge>{Math.round(item.performance_score)}</Badge>
            ) : null}
            {outlier >= 2 ? (
              <Badge variant="accent">
                {m.results.outlierBadge(
                  outlier >= 10
                    ? outlier.toFixed(0)
                    : outlier.toFixed(1).replace(".", ","),
                )}
              </Badge>
            ) : null}
            {item.category ? (
              <Badge variant="neutral">
                {m.results.filterCategory[item.category]}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="max-w-md text-xl font-medium leading-snug tracking-tight">
              {item.headline ??
                item.page_name ??
                (item.account_handle ? `@${item.account_handle}` : item.source)}
            </h2>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              {m.drawer.openOriginal}
              <ArrowSquareOut size={13} />
            </a>
          </div>
          {plays > 0 ? (
            <p className="tnum text-[13px] font-medium text-ink-2">
              {m.results.views(formatCompactNumber(plays))} ·{" "}
              {item.platforms.join(" · ")}
            </p>
          ) : null}
        </div>

        {detail.loading ? (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-hidden">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-24 shrink-0 rounded-(--radius-thumb)" />
              ))}
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            {/* Frames */}
            {detail.frameUrls.length > 0 ? (
              <div>
                <Label>{m.drawer.frames}</Label>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {detail.frameUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Frame ${i + 1}`}
                      className="h-40 w-auto shrink-0 rounded-(--radius-thumb) bg-surface-2 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {analysis ? (
              <>
                <div className="rounded-[20px] bg-surface-2/60 p-5">
                  <Label>{m.drawer.whyTitle}</Label>
                  <p className="mt-1.5 text-[15px] font-medium leading-relaxed">
                    {analysis.why_it_works}
                  </p>
                </div>

                <div>
                  <Label>{m.drawer.hook}</Label>
                  <p className="mt-1.5 text-lg font-medium leading-snug tracking-tight">
                    „{analysis.hook_text}“
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="neutral">{analysis.hook_type}</Badge>
                    {analysis.hook_seconds != null ? (
                      <Badge variant="neutral">
                        {analysis.hook_seconds.toLocaleString("de-DE")} s
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {analysis.structure.length > 0 ? (
                  <div>
                    <Label>{m.drawer.structure}</Label>
                    <ol className="mt-3 space-y-2.5">
                      {analysis.structure.map((seg, i) => (
                        <li key={i} className="flex gap-3 text-[15px]">
                          <span className="tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">
                            <span className="font-medium">{seg.segment}</span>
                            <span className="text-ink-2"> – {seg.description}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <div className="grid gap-6 sm:grid-cols-2">
                  <MetaField label={m.drawer.offer} value={analysis.offer} />
                  <MetaField
                    label={m.drawer.offerFraming}
                    value={analysis.offer_framing}
                  />
                  <MetaField label={m.drawer.cta} value={analysis.cta} />
                  <MetaField label={m.drawer.pacing} value={analysis.pacing} />
                  <MetaField
                    label={m.drawer.faceVsProduct}
                    value={analysis.face_vs_product}
                  />
                  <MetaField label={m.drawer.tone} value={analysis.tone} />
                </div>

                {analysis.visual_patterns.length > 0 ? (
                  <div>
                    <Label>{m.drawer.visualPatterns}</Label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.visual_patterns.map((pattern) => (
                        <Chip key={pattern}>{pattern}</Chip>
                      ))}
                    </div>
                  </div>
                ) : null}

                {analysis.text_overlays.length > 0 ? (
                  <div>
                    <Label>{m.drawer.textOverlays}</Label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.text_overlays.map((overlay) => (
                        <Chip key={overlay}>{overlay}</Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-[15px] leading-relaxed text-ink-2">
                {m.drawer.noAnalysis}
              </p>
            )}

            {item.caption ? (
              <div>
                <Label>{item.source === "meta_ad" ? m.drawer.adText : "Caption"}</Label>
                <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">
                  {item.caption}
                </p>
              </div>
            ) : null}

            {detail.transcript ? (
              <div>
                <Label>{m.drawer.transcript}</Label>
                <p className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-[20px] bg-surface-2/60 p-5 text-[15px] leading-relaxed">
                  {detail.transcript}
                </p>
              </div>
            ) : null}

            {/* Feedback */}
            <div className="rounded-[20px] bg-surface-2/60 p-5">
              <p className="text-[15px] font-medium">{m.drawer.feedbackQuestion}</p>
              <p className="mt-1 text-[13px] text-ink-2">{m.drawer.feedbackHint}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => giveFeedback("fits")}
                  aria-pressed={detail.verdict === "fits"}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium",
                    "transition-colors duration-300 ease-(--ease-out-quart)",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    detail.verdict === "fits"
                      ? "bg-ink text-white"
                      : "bg-surface text-ink hover:bg-[#fbfbfa]",
                  )}
                >
                  <ThumbsUp size={15} weight={detail.verdict === "fits" ? "fill" : "regular"} />
                  {m.drawer.feedbackFits}
                </button>
                <button
                  type="button"
                  onClick={() => giveFeedback("does_not_fit")}
                  aria-pressed={detail.verdict === "does_not_fit"}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium",
                    "transition-colors duration-300 ease-(--ease-out-quart)",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    detail.verdict === "does_not_fit"
                      ? "bg-ink text-white"
                      : "bg-surface text-ink hover:bg-[#fbfbfa]",
                  )}
                >
                  <ThumbsDown
                    size={15}
                    weight={detail.verdict === "does_not_fit" ? "fill" : "regular"}
                  />
                  {m.drawer.feedbackFitsNot}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
