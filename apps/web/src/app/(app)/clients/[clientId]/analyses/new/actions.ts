"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";

export interface NewAnalysisFormState {
  error?: string;
}

const schema = z.object({
  clientId: z.uuid(),
  description: z.string().trim().min(15).max(1000),
});

/**
 * Schritt 1: legt ein Branchenprofil (status: generating) an und reiht
 * den Opus-Job ein. Die Generierung läuft im Worker – keine
 * Vercel-Function wartet auf das Modell.
 */
export async function createProfileAction(
  _prev: NewAnalysisFormState,
  formData: FormData,
): Promise<NewAnalysisFormState> {
  const m = getMessages();
  const parsed = schema.safeParse({
    clientId: formData.get("clientId"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: m.newAnalysis.errors.tooShort };
  }

  const { supabase, user } = await getAuthContext();
  if (!user) return { error: m.newAnalysis.errors.generic };

  // Client über RLS laden – stellt sicher, dass er zur eigenen Org gehört.
  const { data: client } = await supabase
    .from("clients")
    .select("id, organization_id")
    .eq("id", parsed.data.clientId)
    .maybeSingle();
  if (!client) return { error: m.newAnalysis.errors.generic };

  const { data: latest } = await supabase
    .from("industry_profiles")
    .select("version")
    .eq("client_id", client.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile, error: insertError } = await supabase
    .from("industry_profiles")
    .insert({
      organization_id: client.organization_id,
      client_id: client.id,
      version: (latest?.version ?? 0) + 1,
      status: "generating",
      source_description: parsed.data.description,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertError || !profile) {
    return { error: m.newAnalysis.errors.generic };
  }

  const { error: jobError } = await supabase.from("job_queue").insert({
    organization_id: client.organization_id,
    job_type: "generate_profile",
    payload: { profile_id: profile.id },
  });
  if (jobError) {
    return { error: m.newAnalysis.errors.generic };
  }

  redirect(`/clients/${client.id}/profiles/${profile.id}`);
}
