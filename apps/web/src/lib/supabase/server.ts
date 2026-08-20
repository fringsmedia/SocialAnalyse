import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@ci/db";

/**
 * Supabase-Client für Server Components, Server Actions und Route
 * Handler. Nutzt die Session aus den Request-Cookies – alle Queries
 * laufen unter RLS im Kontext des angemeldeten Nutzers.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // In Server Components sind Cookie-Writes nicht erlaubt –
            // die Session-Aktualisierung übernimmt proxy.ts.
          }
        },
      },
    },
  );
}
