"use server";

import { z } from "zod";
import type { Json } from "@ci/db";
import { generationInputSchema } from "@ci/shared/prompts";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";

export interface StartGenerationResult {
  id?: string;
  error?: string;
}

const paramsSchema = z.object({
  clientId: z.uuid(),
  runId: z.uuid(),
});

/** Legt eine Generation (pending) an und reiht den Opus-Job ein. */
export async function startGenerationAction(
  params: { clientId: string; runId: string },
  input: unknown,
): Promise<StartGenerationResult> {
  const m = getMessages();
  const parsedParams = paramsSchema.safeParse(params);
  const parsedInput = generationInputSchema.safeParse(input);
  if (!parsedParams.success || !parsedInput.success) {
    return { error: m.generator.form.errors.invalid };
  }

  const { supabase, user } = await getAuthContext();
  if (!user) return { error: m.generator.form.errors.generic };

  // Run über RLS laden – sichert Mandanten-Zugehörigkeit ab.
  const { data: run } = await supabase
    .from("analysis_runs")
    .select("id, organization_id, client_id, status")
    .eq("id", parsedParams.data.runId)
    .eq("client_id", parsedParams.data.clientId)
    .maybeSingle();
  if (!run || run.status !== "completed") {
    return { error: m.generator.form.errors.generic };
  }

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      organization_id: run.organization_id,
      client_id: run.client_id,
      run_id: run.id,
      input: parsedInput.data as unknown as Json,
      status: "pending",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertError || !generation) {
    return { error: m.generator.form.errors.generic };
  }

  const { error: jobError } = await supabase.from("job_queue").insert({
    organization_id: run.organization_id,
    run_id: run.id,
    job_type: "generate",
    payload: { generation_id: generation.id },
  });
  if (jobError) {
    return { error: m.generator.form.errors.generic };
  }

  return { id: generation.id };
}
