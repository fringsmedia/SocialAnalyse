import { createClient } from "@supabase/supabase-js";
import type { Database } from "@ci/db";

/**
 * Service-Role-Client (umgeht RLS). Ausschließlich serverseitig und nur
 * für Admin-Aufgaben nutzen, die RLS nicht abbilden kann – aktuell der
 * E-Mail-Versand von Einladungen (auth.admin.inviteUserByEmail).
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
