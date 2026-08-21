import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getAuthContext } from "@/lib/auth";
import { RunLive } from "./run-live";

export const metadata: Metadata = { title: "Analyse" };

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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="pb-8 pt-4 md:pt-8">
        <Link
          href={`/clients/${run.client_id}`}
          className="inline-flex items-center gap-2 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft size={13} weight="bold" />
          {client?.name}
        </Link>
      </div>
      <RunLive initialRun={run} clientName={client?.name ?? ""} />
    </div>
  );
}
