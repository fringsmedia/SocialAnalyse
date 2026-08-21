import { z } from "zod";
import type { Json } from "@ci/db";
import {
  median,
  runConfigSchema,
  scoreAdCreatives,
  scoreOrganicCreatives,
  selectAnalysisPool,
  type AdScoreItem,
  type CreativeCategory,
  type OrganicScoreItem,
  type PoolCandidate,
} from "@ci/shared";
import { log } from "../log";
import {
  fetchAllCreatives,
  getRun,
  mergePhaseCounts,
  runChunked,
  updateRun,
} from "../run-utils";
import type { HandlerContext, JobHandler } from "./types";

const payloadSchema = z.object({ run_id: z.uuid() });

interface ScoreCreativeRow {
  id: string;
  source: "meta_ad" | "tiktok" | "instagram";
  category: CreativeCategory | null;
  relevance_score: number | null;
  published_at: string | null;
  platforms: string[];
  account_id: string | null;
  raw_metrics: Record<string, unknown>;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * SCORE-Phase: Outlier-/Engagement-/Velocity-Score für organische
 * Creatives (relativ zum Account-Median), Laufzeit/Reichweite/Varianten
 * für Ads, dann Auswahl des Analyse-Pools mit Mix-Quote 70/20/10.
 */
export const score: JobHandler = async (ctx: HandlerContext) => {
  const { supabase, job } = ctx;
  const { run_id } = payloadSchema.parse(job.payload);

  const run = await getRun(supabase, run_id);
  if (run.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }
  if (run.status !== "filtering" && run.status !== "scoring") {
    return { skipped: true, reason: `Status ist ${run.status}` };
  }
  await updateRun(supabase, run_id, { status: "scoring" });

  const config = runConfigSchema.parse(run.config ?? {});

  const all = await fetchAllCreatives<ScoreCreativeRow>(
    supabase,
    run_id,
    "id, source, category, relevance_score, published_at, platforms, account_id, raw_metrics",
  );

  // ---------- Account-Mediane aus allen gesammelten Items ----------
  // Näherung an "Median der letzten 30 Posts": Basis sind die im Run
  // gesammelten Posts des Accounts (dokumentiert im README).
  const playsByAccount = new Map<string, number[]>();
  for (const c of all) {
    if (c.source === "meta_ad" || !c.account_id) continue;
    const plays = num(c.raw_metrics.plays);
    if (plays <= 0) continue;
    const list = playsByAccount.get(c.account_id) ?? [];
    list.push(plays);
    playsByAccount.set(c.account_id, list);
  }
  const medianByAccount = new Map<string, number>();
  for (const [accountId, plays] of playsByAccount) {
    medianByAccount.set(accountId, median(plays));
  }

  await runChunked([...medianByAccount.entries()], 20, async ([id, value]) => {
    await supabase
      .from("accounts")
      .update({ median_views: value, last_refreshed_at: new Date().toISOString() })
      .eq("id", id);
  });

  // ---------- Relevante Items scoren ----------
  const relevant = all.filter(
    (c) =>
      c.relevance_score != null &&
      c.relevance_score >= config.relevanceThreshold,
  );

  const organicItems: OrganicScoreItem[] = relevant
    .filter((c) => c.source !== "meta_ad")
    .map((c) => ({
      id: c.id,
      metrics: {
        plays: num(c.raw_metrics.plays),
        likes: num(c.raw_metrics.likes),
        comments: num(c.raw_metrics.comments),
        shares: num(c.raw_metrics.shares),
        saves: num(c.raw_metrics.saves),
        publishedAt: c.published_at,
        accountMedianViews: c.account_id
          ? (medianByAccount.get(c.account_id) ?? null)
          : null,
      },
    }));

  // Varianten-Näherung: Ads derselben Page innerhalb des Runs.
  const adsAll = all.filter((c) => c.source === "meta_ad");
  const variantsByPage = new Map<string, number>();
  for (const ad of adsAll) {
    const pageId = String(ad.raw_metrics.page_id ?? "");
    if (!pageId) continue;
    variantsByPage.set(pageId, (variantsByPage.get(pageId) ?? 0) + 1);
  }

  const now = Date.now();
  const adItems: AdScoreItem[] = relevant
    .filter((c) => c.source === "meta_ad")
    .map((c) => {
      const start = c.raw_metrics.delivery_start
        ? new Date(String(c.raw_metrics.delivery_start)).getTime()
        : c.published_at
          ? new Date(c.published_at).getTime()
          : now;
      const stop = c.raw_metrics.delivery_stop
        ? new Date(String(c.raw_metrics.delivery_stop)).getTime()
        : now;
      const euReach = num(c.raw_metrics.eu_total_reach);
      return {
        id: c.id,
        longevityDays: Math.max((stop - start) / 86_400_000, 0),
        variantCount: variantsByPage.get(String(c.raw_metrics.page_id ?? "")) ?? 1,
        platformCount: c.platforms.length,
        euReach: euReach > 0 ? euReach : null,
      };
    });

  const organicScores = scoreOrganicCreatives(organicItems);
  const adScores = scoreAdCreatives(adItems);

  // ---------- Analyse-Pool mit Mix-Quote ----------
  const candidates: PoolCandidate[] = relevant.map((c) => ({
    id: c.id,
    category: c.category ?? "foreign",
    score:
      organicScores.get(c.id)?.score ?? adScores.get(c.id)?.score ?? 0,
  }));
  const pool = new Set(selectAnalysisPool(candidates, config.topN));

  const updates = relevant.map((c) => {
    const scored = organicScores.get(c.id) ?? adScores.get(c.id);
    return {
      id: c.id,
      performance_score: scored?.score ?? 0,
      score_breakdown: {
        ...(scored?.breakdown ?? {}),
        selected_for_analysis: pool.has(c.id),
      } as Json,
    };
  });

  await runChunked(updates, 20, async (update) => {
    await supabase
      .from("creatives")
      .update({
        performance_score: update.performance_score,
        score_breakdown: update.score_breakdown,
      })
      .eq("id", update.id);
  });

  await mergePhaseCounts(supabase, run_id, {
    scored: relevant.length,
    pool: pool.size,
  });

  const fresh = await getRun(supabase, run_id);
  if (fresh.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }

  if (ctx.hasHandler("analyze")) {
    const { error } = await supabase.from("job_queue").insert({
      organization_id: run.organization_id,
      run_id,
      job_type: "analyze",
      payload: { run_id } as Json,
    });
    if (error) {
      throw new Error(
        `Analyze-Job konnte nicht angelegt werden: ${error.message}`,
      );
    }
    log.info("Score abgeschlossen, Analyze-Phase eingereiht", {
      runId: run_id,
      pool: pool.size,
    });
  } else {
    await updateRun(supabase, run_id, {
      status: "completed",
      finished_at: new Date().toISOString(),
    });
  }

  return {
    scored: relevant.length,
    organic: organicItems.length,
    ads: adItems.length,
    pool: pool.size,
  };
};
