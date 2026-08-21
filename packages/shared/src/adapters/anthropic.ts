import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { sleep } from "../utils";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredCompletionResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
}

export interface BatchRequestInput {
  customId: string;
  system: string;
  /** Text-Prompt oder gemischte Content-Blöcke (z. B. mit Bildern). */
  content: string | Anthropic.ContentBlockParam[];
}

export type BatchItemResult<T> =
  | { ok: true; data: T; usage: TokenUsage }
  | { ok: false; error: string };

export interface StructuredBatchResult<T> {
  results: Map<string, BatchItemResult<T>>;
  totals: TokenUsage;
}

export interface AnthropicAdapter {
  structuredCompletion<T>(opts: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<StructuredCompletionResult<T>>;

  /**
   * Structured Outputs über die Batch API (50 % Rabatt, für alle
   * nicht-interaktiven Pipeline-Schritte). Pollt bis "ended".
   */
  structuredBatch<T>(opts: {
    model: string;
    requests: BatchRequestInput[];
    schema: z.ZodType<T>;
    maxTokens?: number;
    pollIntervalMs?: number;
    maxWaitMs?: number;
  }): Promise<StructuredBatchResult<T>>;
}

/**
 * Dünner Wrapper um das offizielle SDK. Structured Outputs über
 * `messages.parse` + zod-Schema – die Antwort ist garantiert
 * schema-valide oder der Call schlägt fehl (ein Retry).
 */
export function createAnthropicAdapter(apiKey: string): AnthropicAdapter {
  const client = new Anthropic({ apiKey });

  return {
    async structuredCompletion({ model, system, prompt, schema, maxTokens }) {
      const attempt = async () => {
        const response = await client.messages.parse({
          model,
          max_tokens: maxTokens ?? 8192,
          system,
          messages: [{ role: "user", content: prompt }],
          output_config: { format: zodOutputFormat(schema) },
        });
        return response;
      };

      let response = await attempt();
      if (response.parsed_output == null) {
        response = await attempt();
      }
      if (response.parsed_output == null) {
        throw new Error(
          `Structured Output konnte nicht geparst werden (model=${model}, stop_reason=${response.stop_reason})`,
        );
      }

      return {
        data: response.parsed_output,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        model: response.model,
      };
    },

    async structuredBatch({
      model,
      requests,
      schema,
      maxTokens,
      pollIntervalMs = 15_000,
      maxWaitMs = 60 * 60_000,
    }) {
      const format = zodOutputFormat(schema);

      const batch = await client.messages.batches.create({
        requests: requests.map((request) => ({
          custom_id: request.customId,
          params: {
            model,
            max_tokens: maxTokens ?? 2048,
            system: request.system,
            messages: [{ role: "user", content: request.content }],
            output_config: { format },
          },
        })),
      });

      const deadline = Date.now() + maxWaitMs;
      let status = batch.processing_status;
      while (status !== "ended") {
        if (Date.now() > deadline) {
          throw new Error(`Batch ${batch.id} überschritt das Zeitlimit`);
        }
        await sleep(pollIntervalMs);
        status = (await client.messages.batches.retrieve(batch.id))
          .processing_status;
      }

      const results = new Map<
        string,
        { ok: true; data: unknown; usage: TokenUsage } | { ok: false; error: string }
      >();
      const totals: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      for await (const entry of await client.messages.batches.results(
        batch.id,
      )) {
        if (entry.result.type === "succeeded") {
          const message = entry.result.message;
          totals.inputTokens += message.usage.input_tokens;
          totals.outputTokens += message.usage.output_tokens;
          const text = message.content.find(
            (block) => block.type === "text",
          )?.text;
          if (!text) {
            results.set(entry.custom_id, {
              ok: false,
              error: `Kein Text-Block (stop_reason=${message.stop_reason})`,
            });
            continue;
          }
          try {
            const data = schema.parse(JSON.parse(text));
            results.set(entry.custom_id, {
              ok: true,
              data,
              usage: {
                inputTokens: message.usage.input_tokens,
                outputTokens: message.usage.output_tokens,
              },
            });
          } catch (error) {
            results.set(entry.custom_id, {
              ok: false,
              error: `Schema-Validierung fehlgeschlagen: ${
                error instanceof Error ? error.message.slice(0, 200) : error
              }`,
            });
          }
        } else {
          results.set(entry.custom_id, {
            ok: false,
            error: `Batch-Ergebnis: ${entry.result.type}`,
          });
        }
      }

      return {
        results: results as StructuredBatchResult<
          z.infer<typeof schema>
        >["results"],
        totals,
      };
    },
  };
}
