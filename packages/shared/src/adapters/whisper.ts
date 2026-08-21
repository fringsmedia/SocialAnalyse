import { z } from "zod";
import type { FetchLike } from "./types";

/**
 * Transkription über die OpenAI-Whisper-API.
 *
 * Entscheidung gegen lokales whisper.cpp: Bei ~80 Videos à ~35 s pro
 * Run kostet die API rund 0,25 USD – dafür entfallen GPU/CPU-Betrieb
 * und Modellpflege. Dieser Adapter hält whisper.cpp als Drop-in offen.
 */

const responseSchema = z.looseObject({
  text: z.string(),
  duration: z.number().optional(),
});

export interface TranscriptionResult {
  text: string;
  durationSeconds: number | null;
}

export interface WhisperAdapter {
  transcribe(input: {
    audio: Uint8Array;
    filename: string;
  }): Promise<TranscriptionResult>;
}

export function createWhisperAdapter(opts: {
  apiKey: string;
  fetchImpl?: FetchLike;
}): WhisperAdapter {
  const fetchImpl = opts.fetchImpl ?? fetch;

  return {
    async transcribe({ audio, filename }) {
      const form = new FormData();
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append(
        "file",
        new Blob([audio], { type: "audio/wav" }),
        filename,
      );

      const response = await fetchImpl(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { authorization: `Bearer ${opts.apiKey}` },
          body: form,
        },
      );
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Whisper ${response.status}: ${body.slice(0, 300)}`);
      }

      const parsed = responseSchema.parse(await response.json());
      return {
        text: parsed.text.trim(),
        durationSeconds: parsed.duration ?? null,
      };
    },
  };
}
