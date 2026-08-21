import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { formatCompactNumber } from "@ci/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const ACTIVE_STATUSES = new Set([
  "queued",
  "collecting",
  "filtering",
  "scoring",
  "analyzing",
  "synthesizing",
]);

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { supabase } = await getAuthContext();
  const m = getMessages();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, description")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) notFound();

  const { data: runs } = await supabase
    .from("analysis_runs")
    .select("id, status, phase_counts, created_at")
    .eq("client_id", client.id)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(30);

  const list = runs ?? [];

  return (
    <div>
      <section className="pb-10 pt-4 md:pb-14 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft size={13} weight="bold" />
          {m.clientDetail.back}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight">
              {client.name}
            </h1>
            {client.description ? (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
                {client.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="dark" size="lg" asChild>
              <Link href={`/clients/${client.id}/generator`}>
                {m.generator.openGenerator}
              </Link>
            </Button>
            <Button size="lg" asChild>
              <Link href={`/clients/${client.id}/analyses/new`}>
                <Plus size={16} weight="bold" />
                {m.clientDetail.newAnalysis}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <span className="tnum text-[13px] font-medium text-ink-2">
            {m.clientDetail.runsCount(list.length)}
          </span>
        </div>

        {list.length === 0 ? (
          <Card className="grid place-items-center px-8 py-20 text-center">
            <h2 className="text-xl font-medium tracking-tight">
              {m.clientDetail.emptyTitle}
            </h2>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">
              {m.clientDetail.emptyText}
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href={`/clients/${client.id}/analyses/new`}>
                  {m.clientDetail.startFirst}
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((run) => {
              const counts = (run.phase_counts ?? {}) as {
                collected?: number;
                relevant?: number;
                analyzed?: number;
              };
              const parts = [
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
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="group block rounded-(--radius-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Card className="flex items-center justify-between gap-4 p-6 transition-colors duration-300 group-hover:bg-[#fbfbfa]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge
                          variant={
                            ACTIVE_STATUSES.has(run.status)
                              ? "accent"
                              : run.status === "completed"
                                ? "dark"
                                : "neutral"
                          }
                        >
                          {m.runStatusLabels[run.status] ?? run.status}
                        </Badge>
                        <span className="text-[13px] font-medium text-ink-2">
                          {m.clientDetail.startedAt(formatDate(run.created_at))}
                        </span>
                      </div>
                      {parts.length > 0 ? (
                        <p className="tnum mt-2 truncate text-[15px] text-ink-2">
                          {parts.join(" → ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink transition-transform duration-300 ease-(--ease-out-quart) group-hover:translate-x-0.5">
                      <ArrowRight size={15} weight="bold" />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
