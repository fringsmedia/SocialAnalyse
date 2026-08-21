"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@ci/db";
import { industryProfileSchema, runConfigSchema } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";

export interface WizardActionState {
  error?: string;
}

async function loadOwnProfile(profileId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { supabase, user, profile: null };
  const { data: profile } = await supabase
    .from("industry_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  return { supabase, user, profile };
}

/** Schritt 2: bearbeitetes Profil speichern (bleibt im Status draft). */
export async function saveProfileAction(
  profileId: string,
  profileJson: unknown,
): Promise<WizardActionState> {
  const m = getMessages();
  const parsedProfile = industryProfileSchema.safeParse(profileJson);
  if (!parsedProfile.success) {
    return { error: m.wizard.errors.generic };
  }

  const { supabase, profile } = await loadOwnProfile(profileId);
  if (!profile || profile.status !== "draft") {
    return { error: m.wizard.errors.generic };
  }

  const { error } = await supabase
    .from("industry_profiles")
    .update({ profile: parsedProfile.data as unknown as Json })
    .eq("id", profileId);
  if (error) return { error: m.wizard.errors.generic };

  return {};
}

/**
 * Schritt 3: Profil bestätigen, Run anlegen, Collect-Job einreihen.
 * Redirect auf die Run-Status-Seite.
 */
export async function startRunAction(
  profileId: string,
  profileJson: unknown,
  configJson: unknown,
): Promise<WizardActionState> {
  const m = getMessages();
  const parsedProfile = industryProfileSchema.safeParse(profileJson);
  const parsedConfig = runConfigSchema.safeParse(configJson);
  if (!parsedProfile.success || !parsedConfig.success) {
    return { error: m.wizard.errors.generic };
  }
  if (parsedConfig.data.platforms.length === 0) {
    return { error: m.wizard.errors.platformsRequired };
  }

  const { supabase, user, profile } = await loadOwnProfile(profileId);
  if (!user || !profile || profile.status !== "draft") {
    return { error: m.wizard.errors.generic };
  }

  const { error: profileError } = await supabase
    .from("industry_profiles")
    .update({
      profile: parsedProfile.data as unknown as Json,
      status: "confirmed",
    })
    .eq("id", profileId);
  if (profileError) return { error: m.wizard.errors.generic };

  const { data: run, error: runError } = await supabase
    .from("analysis_runs")
    .insert({
      organization_id: profile.organization_id,
      client_id: profile.client_id,
      profile_id: profile.id,
      status: "queued",
      config: parsedConfig.data as unknown as Json,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (runError || !run) return { error: m.wizard.errors.generic };

  const { error: jobError } = await supabase.from("job_queue").insert({
    organization_id: profile.organization_id,
    run_id: run.id,
    job_type: "collect",
    payload: { run_id: run.id },
  });
  if (jobError) return { error: m.wizard.errors.generic };

  redirect(`/runs/${run.id}`);
}

/** Fehlgeschlagene Generierung erneut anstoßen. */
export async function retryProfileAction(
  profileId: string,
): Promise<WizardActionState> {
  const m = getMessages();
  const { supabase, profile } = await loadOwnProfile(profileId);
  if (!profile || profile.status !== "failed") {
    return { error: m.wizard.errors.generic };
  }

  const { error } = await supabase
    .from("industry_profiles")
    .update({ status: "generating" })
    .eq("id", profileId);
  if (error) return { error: m.wizard.errors.generic };

  const { error: jobError } = await supabase.from("job_queue").insert({
    organization_id: profile.organization_id,
    job_type: "generate_profile",
    payload: { profile_id: profileId },
  });
  if (jobError) return { error: m.wizard.errors.generic };

  revalidatePath(`/clients/${profile.client_id}/profiles/${profileId}`);
  return {};
}
