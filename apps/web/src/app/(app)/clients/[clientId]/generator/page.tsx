import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GeneratorView,
  type GenerationItemView,
  type PatternRef,
  type SourceRef,
} from "./generator-view";

export const metadata: Metadata = { title: "Creative-Generator" };

export default async function GeneratorPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { supabase } = await getAuthContext();
  const m = getMessages();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) notFound();

  // Jüngster abgeschlossener Run mit Patterns als Basis.
  const { data: runs } = await supabase
    .from("analysis_runs")
    .select("id, created_at")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  let baseRun: { id: string; created_at: string } | null = null;
  let patterns: PatternRef[] = [];
  for (const run of runs ?? []) {
    const { data } = await supabase
      .from("patterns")
      .select("id, type, title, example_creative_ids")
      .eq("run_id", run.id);
    if (data && data.length > 0) {
      baseRun = run;
      patterns = data.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
      }));

      // Thumbnails/URLs der Quell-Creatives für die Item-Belege.
      const exampleIds = [
        ...new Set(data.flatMap((p) => p.example_creative_ids ?? [])),
      ];
      const sources: SourceRef[] = [];
      for (let i = 0; i < exampleIds.length; i += 200) {
        const { data: creativeRows } = await supabase
          .from("creatives")
          .select("id, url, source, raw_metrics")
          .in("id", exampleIds.slice(i, i + 200));
        for (const row of creativeRows ?? []) {
          const metrics = (row.raw_metrics ?? {}) as Record<string, unknown>;
          sources.push({
            id: row.id,
            url: row.url,
            source: row.source,
            thumbnail_url:
              typeof metrics.thumbnail_url === "string"
                ? metrics.thumbnail_url
                : null,
          });
        }
      }

      // Jüngste erfolgreiche Generation vorab laden.
      const { data: generation } = await supabase
        .from("generations")
        .select("id, status")
        .eq("client_id", clientId)
        .eq("run_id", run.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let items: GenerationItemView[] = [];
      if (generation && generation.status === "succeeded") {
        const { data: itemRows } = await supabase
          .from("generation_items")
          .select("id, kind, content, pattern_id, source_creative_ids, position")
          .eq("generation_id", generation.id)
          .order("position", { ascending: true });
        items = (itemRows ?? []) as GenerationItemView[];
      }

      return (
        <div className="mx-auto max-w-6xl">
          <BackLink clientId={client.id} clientName={client.name} />
          <GeneratorView
            clientId={client.id}
            runId={run.id}
            runDate={run.created_at}
            patterns={patterns}
            sources={sources}
            initialGenerationId={
              generation?.status === "succeeded" ? generation.id : null
            }
            initialItems={items}
          />
        </div>
      );
    }
  }

  // Kein abgeschlossener Run mit Patterns → Empty State.
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink clientId={client.id} clientName={client.name} />
      <Card className="grid place-items-center px-8 py-20 text-center">
        <h1 className="text-xl font-medium tracking-tight">
          {m.generator.needRun.title}
        </h1>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">
          {m.generator.needRun.text}
        </p>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href={`/clients/${client.id}/analyses/new`}>
              {m.generator.needRun.cta}
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BackLink({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  return (
    <div className="pb-8 pt-4 md:pt-8">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-2 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <ArrowLeft size={13} weight="bold" />
        {clientName}
      </Link>
    </div>
  );
}
