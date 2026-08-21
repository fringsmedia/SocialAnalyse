import { z } from "zod";
import type { Json, TablesInsert } from "@ci/db";
import { tokenCostUsd } from "@ci/shared";
import { createAnthropicAdapter } from "@ci/shared/adapters";
import {
  buildGenerationUserPrompt,
  CREATIVE_GENERATION_MODEL,
  CREATIVE_GENERATION_PROMPT_VERSION,
  creativeAnalysisSchema,
  creativeGenerationSystemPrompt,
  generationInputSchema,
  generationResultSchema,
  type GenerationPatternInput,
  type GenerationSourceInput,
} from "@ci/shared/prompts";
import { log } from "../log";
import type { HandlerContext, JobHandler } from "./types";

const payloadSchema = z.object({ generation_id: z.uuid() });

/**
 * GENERATE-Phase (auf Nutzer-Anfrage): Opus erstellt aus den Patterns
 * des Runs 15 Hooks, 5 Skript-Strukturen, 5 Ad-Texte und
 * 3 Angebotsvarianten – jeder Vorschlag mit pattern_id und 1–2
 * source_creative_ids.
 */
export const generate: JobHandler = async (ctx: HandlerContext) => {
  const { supabase, env, job } = ctx;
  const { generation_id } = payloadSchema.parse(job.payload);

  const { data: generation, error: loadError } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generation_id)
    .single();
  if (loadError || !generation) {
    throw new Error(`Generation ${generation_id} nicht gefunden`);
  }
  if (generation.status === "succeeded") {
    return { skipped: true, reason: "bereits abgeschlossen" };
  }
  if (!generation.run_id) {
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generation_id);
    throw new Error("Generation ohne run_id");
  }
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt");
  }

  await supabase
    .from("generations")
    .update({ status: "running" })
    .eq("id", generation_id);

  try {
    const request = generationInputSchema.parse(generation.input);

    // Patterns des Runs + Analysen der Beispiel-Creatives laden.
    const { data: patterns } = await supabase
      .from("patterns")
      .select("id, type, title, description, example_creative_ids, data")
      .eq("run_id", generation.run_id)
      .order("frequency", { ascending: false });
    if (!patterns || patterns.length === 0) {
      throw new Error("Keine Patterns für diesen Run vorhanden");
    }

    const exampleIds = [
      ...new Set(patterns.flatMap((p) => p.example_creative_ids ?? [])),
    ];
    const sourceDigests = new Map<
      string,
      { source: string; hookText: string | null; whyItWorks: string | null }
    >();
    for (let i = 0; i < exampleIds.length; i += 200) {
      const slice = exampleIds.slice(i, i + 200);
      const [{ data: creativeRows }, { data: analysisRows }] =
        await Promise.all([
          supabase.from("creatives").select("id, source").in("id", slice),
          supabase
            .from("creative_analyses")
            .select("creative_id, analysis")
            .in("creative_id", slice),
        ]);
      const analysisById = new Map(
        (analysisRows ?? []).map((r) => [r.creative_id, r.analysis]),
      );
      for (const row of creativeRows ?? []) {
        const parsed = creativeAnalysisSchema.safeParse(
          analysisById.get(row.id),
        );
        sourceDigests.set(row.id, {
          source: row.source,
          hookText: parsed.success ? parsed.data.hook_text : null,
          whyItWorks: parsed.success ? parsed.data.why_it_works : null,
        });
      }
    }

    // Referenzen p1…pN und c1…cM aufbauen.
    const patternInputs: GenerationPatternInput[] = [];
    const patternRefToId = new Map<string, string>();
    patterns.forEach((pattern, index) => {
      const ref = `p${index + 1}`;
      patternRefToId.set(ref, pattern.id);
      const extra = (pattern.data ?? {}) as { why_it_works?: string };
      patternInputs.push({
        ref,
        type: pattern.type,
        title: pattern.title,
        description: pattern.description,
        whyItWorks: extra.why_it_works ?? null,
      });
    });

    const sourceInputs: GenerationSourceInput[] = [];
    const sourceRefToId = new Map<string, string>();
    exampleIds.forEach((creativeId, index) => {
      const ref = `c${index + 1}`;
      sourceRefToId.set(ref, creativeId);
      const digest = sourceDigests.get(creativeId);
      sourceInputs.push({
        ref,
        source: digest?.source ?? "unbekannt",
        hookText: digest?.hookText ?? null,
        whyItWorks: digest?.whyItWorks ?? null,
      });
    });

    const adapter = createAnthropicAdapter(env.ANTHROPIC_API_KEY);
    const result = await adapter.structuredCompletion({
      model: CREATIVE_GENERATION_MODEL,
      system: creativeGenerationSystemPrompt,
      prompt: buildGenerationUserPrompt({
        patterns: patternInputs,
        sources: sourceInputs,
        request,
      }),
      schema: generationResultSchema,
      maxTokens: 12_000,
    });

    // Items schreiben (Idempotenz: alte Items der Generation ersetzen).
    await supabase
      .from("generation_items")
      .delete()
      .eq("generation_id", generation_id);

    const resolvePattern = (ref: string): string | null =>
      patternRefToId.get(ref.trim()) ?? null;
    const resolveSources = (refs: string[]): string[] =>
      refs
        .map((ref) => sourceRefToId.get(ref.trim()))
        .filter((id): id is string => Boolean(id))
        .slice(0, 2);

    const rows: TablesInsert<"generation_items">[] = [];
    const push = (
      kind: string,
      content: Record<string, unknown>,
      patternRef: string,
      sourceRefs: string[],
    ) => {
      rows.push({
        organization_id: generation.organization_id,
        generation_id,
        kind,
        content: content as Json,
        pattern_id: resolvePattern(patternRef),
        source_creative_ids: resolveSources(sourceRefs),
        position: rows.length,
      });
    };

    for (const hook of result.data.hooks) {
      push("hook", { text: hook.text }, hook.pattern_ref, hook.source_refs);
    }
    for (const structure of result.data.script_structures) {
      push(
        "script_structure",
        { title: structure.title, outline: structure.outline },
        structure.pattern_ref,
        structure.source_refs,
      );
    }
    for (const ad of result.data.ad_texts) {
      push(
        "ad_text",
        { headline: ad.headline, body: ad.body, cta: ad.cta },
        ad.pattern_ref,
        ad.source_refs,
      );
    }
    for (const offer of result.data.offer_variants) {
      push(
        "offer_variant",
        { title: offer.title, description: offer.description },
        offer.pattern_ref,
        offer.source_refs,
      );
    }

    const { error: insertError } = await supabase
      .from("generation_items")
      .insert(rows);
    if (insertError) {
      throw new Error(`Items konnten nicht gespeichert werden: ${insertError.message}`);
    }

    await supabase
      .from("generations")
      .update({
        status: "succeeded",
        model: result.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
      })
      .eq("id", generation_id);

    log.info("Generierung abgeschlossen", {
      generationId: generation_id,
      items: rows.length,
      usd: tokenCostUsd(
        CREATIVE_GENERATION_MODEL,
        result.usage.inputTokens,
        result.usage.outputTokens,
      ).toFixed(4),
    });

    return {
      promptVersion: CREATIVE_GENERATION_PROMPT_VERSION,
      items: rows.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    };
  } catch (error) {
    if (job.attempts >= job.max_attempts) {
      await supabase
        .from("generations")
        .update({ status: "failed" })
        .eq("id", generation_id);
    }
    throw error;
  }
};
