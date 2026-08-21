import { z } from "zod";
import type { Json } from "@ci/db";
import { generatedProfileSchema, toStoredProfile } from "@ci/shared";
import { createAnthropicAdapter } from "@ci/shared/adapters";
import {
  buildIndustryProfileUserPrompt,
  INDUSTRY_PROFILE_MODEL,
  INDUSTRY_PROFILE_PROMPT_VERSION,
  industryProfileSystemPrompt,
} from "@ci/shared/prompts";
import type { JobHandler } from "./types";

const payloadSchema = z.object({ profile_id: z.uuid() });

/**
 * PROFILE-Phase: generiert das Branchenprofil (Opus, Structured Output)
 * aus der Nutzerbeschreibung. Der Nutzer prüft und bestätigt danach in
 * der UI, erst dann startet die Sammlung.
 */
export const generateProfile: JobHandler = async ({ supabase, env, job }) => {
  const { profile_id } = payloadSchema.parse(job.payload);

  const { data: profile, error } = await supabase
    .from("industry_profiles")
    .select("*")
    .eq("id", profile_id)
    .single();
  if (error || !profile) {
    throw new Error(`Profil ${profile_id} nicht gefunden: ${error?.message}`);
  }

  // Idempotenz: bereits generierte/bestätigte Profile nicht überschreiben.
  if (profile.status !== "generating") {
    return { skipped: true, reason: `Status ist ${profile.status}` };
  }

  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", profile.client_id)
    .single();

  // Feedback-Schleife: Bewertungen aus früheren Runs dieses Kunden
  // fließen als Kontext in die Profil-Generierung ein.
  const feedback = { fits: [] as string[], fitsNot: [] as string[] };
  const { data: clientRuns } = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("client_id", profile.client_id);
  const runIds = (clientRuns ?? []).map((r) => r.id);
  if (runIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from("feedback")
      .select("creative_id, verdict")
      .eq("organization_id", profile.organization_id)
      .limit(200);
    const byCreative = new Map(
      (feedbackRows ?? []).map((f) => [f.creative_id, f.verdict]),
    );
    if (byCreative.size > 0) {
      const ids = [...byCreative.keys()];
      for (let i = 0; i < ids.length; i += 200) {
        const { data: creativeRows } = await supabase
          .from("creatives")
          .select("id, run_id, caption")
          .in("id", ids.slice(i, i + 200));
        for (const row of creativeRows ?? []) {
          if (!runIds.includes(row.run_id) || !row.caption) continue;
          const verdict = byCreative.get(row.id);
          if (verdict === "fits" && feedback.fits.length < 20) {
            feedback.fits.push(row.caption);
          } else if (
            verdict === "does_not_fit" &&
            feedback.fitsNot.length < 20
          ) {
            feedback.fitsNot.push(row.caption);
          }
        }
      }
    }
  }

  const adapter = createAnthropicAdapter(env.ANTHROPIC_API_KEY);

  try {
    const result = await adapter.structuredCompletion({
      model: INDUSTRY_PROFILE_MODEL,
      system: industryProfileSystemPrompt,
      prompt: buildIndustryProfileUserPrompt({
        clientName: client?.name ?? "Unbekannt",
        description: profile.source_description,
        feedback,
      }),
      schema: generatedProfileSchema,
      maxTokens: 4096,
    });

    const stored = toStoredProfile(result.data);

    const { error: updateError } = await supabase
      .from("industry_profiles")
      .update({
        profile: stored as unknown as Json,
        status: "draft",
      })
      .eq("id", profile_id);
    if (updateError) {
      throw new Error(`Profil-Update fehlgeschlagen: ${updateError.message}`);
    }

    return {
      promptVersion: INDUSTRY_PROFILE_PROMPT_VERSION,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    };
  } catch (err) {
    // Letzter Versuch fehlgeschlagen → Profil terminal als failed markieren,
    // damit die UI nicht endlos wartet.
    if (job.attempts >= job.max_attempts) {
      await supabase
        .from("industry_profiles")
        .update({ status: "failed" })
        .eq("id", profile_id);
    }
    throw err;
  }
};
