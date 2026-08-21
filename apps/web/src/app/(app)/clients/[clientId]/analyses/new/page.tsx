import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/stepper";
import { NewAnalysisForm } from "./form";

export const metadata: Metadata = { title: "Analyse anlegen" };

export default async function NewAnalysisPage({
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="pb-8 pt-4 md:pt-8">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-2 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft size={13} weight="bold" />
          {client.name}
        </Link>
        <Stepper steps={m.wizard.steps} active={0} className="mt-6" />
      </div>

      <Card className="p-8 md:p-10">
        <h1 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
          {m.newAnalysis.title}
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
          {m.newAnalysis.subtitle}
        </p>
        <NewAnalysisForm clientId={client.id} />
      </Card>
    </div>
  );
}
