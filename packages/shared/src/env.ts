import { z } from "zod";

/**
 * Env-Validierung. Jede App parsed beim Start ihr eigenes Schema –
 * fehlende Variablen schlagen sofort und mit klarer Meldung fehl,
 * nicht erst tief in einem Request.
 */

export const publicWebEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serverWebEnvSchema = publicWebEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const workerEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Poll-Intervall der Queue in ms. */
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  /** Eindeutige Worker-Identität für job_queue.locked_by. */
  WORKER_ID: z.string().min(1).optional(),
  /**
   * Externe Dienste: optional beim Start – Handler, die einen Key
   * brauchen, schlagen mit klarer Meldung fehl, wenn er fehlt.
   */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  APIFY_TOKEN: z.string().min(1).optional(),
  META_AD_LIBRARY_ACCESS_TOKEN: z.string().min(1).optional(),
  APIFY_TIKTOK_ACTOR: z.string().min(1).optional(),
  APIFY_INSTAGRAM_ACTOR: z.string().min(1).optional(),
  /** Whisper-Transkription (ANALYZE-Phase). */
  OPENAI_API_KEY: z.string().min(1).optional(),
  /** Pfade zu ffmpeg/ffprobe, falls nicht im PATH. */
  FFMPEG_PATH: z.string().min(1).optional(),
  FFPROBE_PATH: z.string().min(1).optional(),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
    throw new Error(`Ungültige Environment-Konfiguration:\n${issues}`);
  }
  return result.data;
}
