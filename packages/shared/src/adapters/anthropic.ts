import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredCompletionResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
}

export interface AnthropicAdapter {
  structuredCompletion<T>(opts: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<StructuredCompletionResult<T>>;
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
  };
}
