import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@ci/db";

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: { id: string; email: string | null } | null;
  org: Tables<"organizations"> | null;
  role: Tables<"organization_members">["role"] | null;
}

/**
 * Auth-Kontext für Server Components und Actions: Nutzer + erste
 * Organisation. (Org-Switcher für Mehrfach-Mitgliedschaften folgt
 * in Phase 6 – das Datenmodell trägt bereits mehrere.)
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, org: null, role: null };
  }

  const authUser = { id: user.id, email: user.email ?? null };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { supabase, user: authUser, org: null, role: null };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  return {
    supabase,
    user: authUser,
    org: org ?? null,
    role: membership.role,
  };
}
