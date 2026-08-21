import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { industryProfileSchema } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";
import { ProfileWizard } from "./wizard";

export const metadata: Metadata = { title: "Profil prüfen" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ clientId: string; profileId: string }>;
}) {
  const { clientId, profileId } = await params;
  const { supabase } = await getAuthContext();

  const { data: profile } = await supabase
    .from("industry_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!profile) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  // Bereits bestätigt → es gibt (mindestens) einen Run; dorthin leiten.
  if (profile.status === "confirmed") {
    const { data: run } = await supabase
      .from("analysis_runs")
      .select("id")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (run) redirect(`/runs/${run.id}`);
  }

  const parsedProfile = industryProfileSchema.parse(profile.profile ?? {});

  return (
    <div className="mx-auto max-w-3xl">
      <div className="pb-8 pt-4 md:pt-8">
        <Link
          href={`/clients/${clientId}`}
          className="inline-flex items-center gap-2 rounded-full text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <ArrowLeft size={13} weight="bold" />
          {client?.name}
        </Link>
      </div>

      <ProfileWizard
        profileId={profile.id}
        clientId={clientId}
        status={profile.status as "generating" | "draft" | "failed"}
        sourceDescription={profile.source_description}
        initialProfile={parsedProfile}
      />
    </div>
  );
}
