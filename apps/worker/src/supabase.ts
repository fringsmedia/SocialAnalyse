import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ci/db";
import type { WorkerEnv } from "@ci/shared";

export type ServiceClient = SupabaseClient<Database>;

/**
 * Service-Role-Client: umgeht RLS. Der Worker ist die einzige
 * Komponente, die Pipeline-Ergebnisse schreibt.
 */
export function createServiceClient(env: WorkerEnv): ServiceClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
