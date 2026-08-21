import { z } from "zod";
import type { Json, TablesInsert } from "@ci/db";
import {
  APIFY_USD_PER_1000,
  industryProfileSchema,
  REGION_COUNTRIES,
  runConfigSchema,
  type IndustryProfile,
  type RunConfig,
} from "@ci/shared";
import {
  createApifyRunner,
  createInstagramAdapter,
  createMetaAdLibraryAdapter,
  createTikTokAdapter,
  type NormalizedCreative,
} from "@ci/shared/adapters";
import { log } from "../log";
import {
  appendRunError,
  getRun,
  mergeCostBreakdown,
  mergePhaseCounts,
  updateRun,
} from "../run-utils";
import type { ServiceClient } from "../supabase";
import type { HandlerContext, JobHandler } from "./types";

const payloadSchema = z.object({ run_id: z.uuid() });

/** Aufteilung des Sammelziels auf die gewählten Plattformen. */
function platformTargets(config: RunConfig): Record<string, number> {
  const targets: Record<string, number> = {};
  const hasMeta = config.platforms.includes("meta_ad");
  const organic = config.platforms.filter((p) => p !== "meta_ad");
  const metaShare = hasMeta ? (organic.length > 0 ? 0.4 : 1) : 0;
  if (hasMeta) {
    targets.meta_ad = Math.round(config.collectTarget * metaShare);
  }
  const organicTotal = config.collectTarget - (targets.meta_ad ?? 0);
  organic.forEach((p, i) => {
    targets[p] = Math.round(organicTotal / organic.length) * (i === 0 ? 1 : 1);
  });
  return targets;
}

/** Suchbegriffe fürs Ad-Archiv: die stärksten Keywords, dedupliziert. */
function adSearchTerms(profile: IndustryProfile): string[] {
  return [...profile.keywords_de.slice(0, 6), ...profile.keywords_en.slice(0, 3)]
    .map((k) => k.trim())
    .filter(Boolean);
}

async function upsertCollected(
  supabase: ServiceClient,
  run: { id: string; organization_id: string },
  items: NormalizedCreative[],
): Promise<void> {
  if (items.length === 0) return;

  // 1. Accounts upserten und IDs einsammeln (Cache für Outlier-Score).
  const accountRows = new Map<string, TablesInsert<"accounts">>();
  for (const item of items) {
    if (!item.account) continue;
    const key = `${item.account.platform}:${item.account.external_id}`;
    accountRows.set(key, {
      organization_id: run.organization_id,
      platform: item.account.platform,
      external_id: item.account.external_id,
      handle: item.account.handle,
      display_name: item.account.display_name,
      bio: item.account.bio,
      follower_count: item.account.follower_count,
    });
  }

  const accountIds = new Map<string, string>();
  const accountList = [...accountRows.values()];
  for (let i = 0; i < accountList.length; i += 500) {
    const { data, error } = await supabase
      .from("accounts")
      .upsert(accountList.slice(i, i + 500), {
        onConflict: "organization_id,platform,external_id",
      })
      .select("id, platform, external_id");
    if (error) throw new Error(`Account-Upsert fehlgeschlagen: ${error.message}`);
    for (const row of data ?? []) {
      accountIds.set(`${row.platform}:${row.external_id}`, row.id);
    }
  }

  // 2. Creatives upserten (Duplikate pro Run ignorieren).
  const creativeRows: TablesInsert<"creatives">[] = items.map((item) => ({
    organization_id: run.organization_id,
    run_id: run.id,
    source: item.source,
    external_id: item.external_id,
    url: item.url,
    platforms: item.platforms,
    caption: item.caption,
    published_at: item.published_at,
    account_id: item.account
      ? (accountIds.get(
          `${item.account.platform}:${item.account.external_id}`,
        ) ?? null)
      : null,
    raw_metrics: {
      ...item.metrics,
      thumbnail_url: item.thumbnail_url,
    } as Json,
  }));

  for (let i = 0; i < creativeRows.length; i += 500) {
    const { error } = await supabase
      .from("creatives")
      .upsert(creativeRows.slice(i, i + 500), {
        onConflict: "run_id,source,external_id",
        ignoreDuplicates: true,
      });
    if (error) {
      throw new Error(`Creative-Upsert fehlgeschlagen: ${error.message}`);
    }
  }
}

async function countCollected(
  supabase: ServiceClient,
  runId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("creatives")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  if (error) throw new Error(`Zählung fehlgeschlagen: ${error.message}`);
  return count ?? 0;
}

/**
 * COLLECT-Phase: sammelt breit über Meta Ad Library und Apify
 * (TikTok/Instagram) – nur URLs, Captions, Thumbnails-URLs, Metriken,
 * Account-Metadaten. Fortschritt und Kosten landen live am Run.
 */
export const collect: JobHandler = async (ctx: HandlerContext) => {
  const { supabase, env, job } = ctx;
  const { run_id } = payloadSchema.parse(job.payload);

  const run = await getRun(supabase, run_id);
  if (run.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }
  if (run.status !== "queued" && run.status !== "collecting") {
    return { skipped: true, reason: `Status ist ${run.status}` };
  }

  const { data: profileRow } = await supabase
    .from("industry_profiles")
    .select("profile")
    .eq("id", run.profile_id)
    .single();
  const profile = industryProfileSchema.parse(profileRow?.profile ?? {});
  const config = runConfigSchema.parse(run.config ?? {});

  await updateRun(supabase, run_id, {
    status: "collecting",
    started_at: run.started_at ?? new Date().toISOString(),
  });

  const targets = platformTargets(config);
  const enabledAdjacent = profile.adjacent_industries
    .filter((a) => a.enabled)
    .map((a) => a.name);

  let apifyItems = { tiktok: 0, instagram: 0 };

  // ---------- Meta Ad Library ----------
  if (targets.meta_ad) {
    if (!env.META_AD_LIBRARY_ACCESS_TOKEN) {
      await appendRunError(supabase, run_id, {
        phase: "collect",
        message:
          "META_AD_LIBRARY_ACCESS_TOKEN fehlt – Meta Ads übersprungen",
      });
    } else {
      const adapter = createMetaAdLibraryAdapter({
        accessToken: env.META_AD_LIBRARY_ACCESS_TOKEN,
      });
      const terms = adSearchTerms(profile);
      const perTerm = Math.max(
        Math.ceil(targets.meta_ad / Math.max(terms.length, 1)),
        25,
      );
      for (const term of terms) {
        try {
          const ads = await adapter.searchAds({
            searchTerms: term,
            countries: REGION_COUNTRIES[config.region],
            maxItems: perTerm,
          });
          await upsertCollected(supabase, run, ads);
          await mergePhaseCounts(supabase, run_id, {
            collected: await countCollected(supabase, run_id),
          });
        } catch (error) {
          await appendRunError(supabase, run_id, {
            phase: "collect",
            message: `Meta Ad Library (Begriff "${term}") fehlgeschlagen`,
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  // ---------- TikTok / Instagram über Apify ----------
  const organicPlatforms = (["tiktok", "instagram"] as const).filter(
    (p) => targets[p],
  );
  if (organicPlatforms.length > 0) {
    if (!env.APIFY_TOKEN) {
      await appendRunError(supabase, run_id, {
        phase: "collect",
        message: "APIFY_TOKEN fehlt – TikTok/Instagram übersprungen",
      });
    } else {
      const runner = createApifyRunner({ token: env.APIFY_TOKEN });
      const searchQueries = [
        ...profile.keywords_de.slice(0, 5),
        ...enabledAdjacent.slice(0, 2),
      ];

      for (const platform of organicPlatforms) {
        const adapter =
          platform === "tiktok"
            ? createTikTokAdapter({ runner, actorId: env.APIFY_TIKTOK_ACTOR })
            : createInstagramAdapter({
                runner,
                actorId: env.APIFY_INSTAGRAM_ACTOR,
              });
        const profiles = profile.seed_accounts
          .filter((a) => a.platform === platform)
          .map((a) => a.handle);
        try {
          const items = await adapter.collect({
            hashtags: profile.hashtags.slice(0, 10),
            searchQueries,
            profiles,
            maxItems: targets[platform] ?? 0,
          });
          apifyItems = {
            ...apifyItems,
            [platform]: apifyItems[platform] + items.length,
          };
          await upsertCollected(supabase, run, items);
          await mergePhaseCounts(supabase, run_id, {
            collected: await countCollected(supabase, run_id),
          });
        } catch (error) {
          await appendRunError(supabase, run_id, {
            phase: "collect",
            message: `${platform === "tiktok" ? "TikTok" : "Instagram"}-Sammlung fehlgeschlagen`,
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const apifyUsd =
        (apifyItems.tiktok / 1000) * APIFY_USD_PER_1000.tiktok +
        (apifyItems.instagram / 1000) * APIFY_USD_PER_1000.instagram;
      await mergeCostBreakdown(supabase, run_id, "apify", {
        events: apifyItems.tiktok + apifyItems.instagram,
        usd: Number(apifyUsd.toFixed(4)),
      });
    }
  }

  // ---------- Abschluss & Übergabe an die nächste Phase ----------
  const total = await countCollected(supabase, run_id);
  await mergePhaseCounts(supabase, run_id, { collected: total });

  if (total === 0) {
    await appendRunError(supabase, run_id, {
      phase: "collect",
      message: "Keine Creatives gesammelt – Run abgebrochen",
    });
    await updateRun(supabase, run_id, {
      status: "failed",
      finished_at: new Date().toISOString(),
    });
    return { collected: 0, outcome: "failed" };
  }

  if (ctx.hasHandler("filter")) {
    const { error } = await supabase.from("job_queue").insert({
      organization_id: run.organization_id,
      run_id,
      job_type: "filter",
      payload: { run_id } as Json,
    });
    if (error) {
      throw new Error(`Filter-Job konnte nicht angelegt werden: ${error.message}`);
    }
    log.info("Collect abgeschlossen, Filter-Phase eingereiht", {
      runId: run_id,
      collected: total,
    });
    return { collected: total, outcome: "chained_filter" };
  }

  // Filter-Phase existiert noch nicht (kommt in Phase 2) → Run beenden.
  await updateRun(supabase, run_id, {
    status: "completed",
    finished_at: new Date().toISOString(),
  });
  return { collected: total, outcome: "completed" };
};
