import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { PhaseCounts } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";
import { RunLive } from "./run-live";
import { ResultsShell } from "./results-shell";
import type { CreativeLite } from "./run-results";

export const metadata: Metadata = { title: "Analyse" };

interface CreativeRow {
  id: string;
  source: "meta_ad" | "tiktok" | "instagram";
  url: string;
  platforms: string[];
  caption: string | null;
  published_at: string | null;
  category: "core" | "adjacent" | "foreign" | null;
  performance_score: number | null;
  score_breakdown: Record<string, unknown> | null;
  raw_metrics: Record<string, unknown> | null;
  account_id: string | null;
}

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const { supabase } = await getAuthContext();

  const { data: run } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (!run) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", run.client_id)
    .single();

  let results: { videos: CreativeLite[]; ads: CreativeLite[] } | null = null;

  if (run.status === "completed") {
    const { data: rows } = await supabase
      .from("creatives")
      .select(
        "id, source, url, platforms, caption, published_at, category, performance_score, score_breakdown, raw_metrics, account_id",
      )
      .eq("run_id", runId)
      .not("performance_score", "is", null)
      .order("performance_score", { ascending: false })
      .limit(400);

    if (rows && rows.length > 0) {
      const typedRows = rows as unknown as CreativeRow[];

      const accountIds = [
        ...new Set(
          typedRows.map((r) => r.account_id).filter(Boolean) as string[],
        ),
      ];
      const handles = new Map<string, string | null>();
      for (let i = 0; i < accountIds.length; i += 200) {
        const { data } = await supabase
          .from("accounts")
          .select("id, handle")
          .in("id", accountIds.slice(i, i + 200));
        for (const row of data ?? []) handles.set(row.id, row.handle);
      }

      // Analysen (ab Phase 3): eine Zeile "Warum performt das".
      const why = new Map<string, string | null>();
      const analyzed = new Set<string>();
      const creativeIds = typedRows.map((r) => r.id);
      for (let i = 0; i < creativeIds.length; i += 200) {
        const { data } = await supabase
          .from("creative_analyses")
          .select("creative_id, analysis")
          .in("creative_id", creativeIds.slice(i, i + 200));
        for (const row of data ?? []) {
          analyzed.add(row.creative_id);
          const analysis = row.analysis as { why_it_works?: string } | null;
          why.set(row.creative_id, analysis?.why_it_works ?? null);
        }
      }

      const lites: CreativeLite[] = typedRows.map((row) => {
        const metrics = row.raw_metrics ?? {};
        return {
          id: row.id,
          source: row.source,
          url: row.url,
          platforms: row.platforms,
          caption: row.caption,
          published_at: row.published_at,
          thumbnail_url:
            typeof metrics.thumbnail_url === "string"
              ? metrics.thumbnail_url
              : null,
          category: row.category,
          performance_score: row.performance_score,
          breakdown: row.score_breakdown ?? {},
          metrics,
          account_handle: row.account_id
            ? (handles.get(row.account_id) ?? null)
            : null,
          page_name:
            typeof metrics.page_name === "string" ? metrics.page_name : null,
          headline:
            typeof metrics.headline === "string" ? metrics.headline : null,
          why_it_works: why.get(row.id) ?? null,
          has_analysis: analyzed.has(row.id),
        };
      });

      results = {
        videos: lites.filter((l) => l.source !== "meta_ad"),
        ads: lites.filter((l) => l.source === "meta_ad"),
      };
    }
  }

  return (
    <div className={results ? "mx-auto max-w-6xl" : "mx-auto max-w-3xl"}>
      <div className="pb-8 pt-4 md:pt-8">
        <Link
          href={`/clients/${run.client_id}`}
          className="inline-flex items-center gap-2 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft size={13} weight="bold" />
          {client?.name}
        </Link>
      </div>
      {results ? (
        <ResultsShell
          clientName={client?.name ?? ""}
          counts={(run.phase_counts ?? {}) as PhaseCounts}
          videos={results.videos}
          ads={results.ads}
        />
      ) : (
        <RunLive initialRun={run} clientName={client?.name ?? ""} />
      )}
    </div>
  );
}
