/**
 * Seed-Script für die LOKALE Entwicklung (niemals gegen Produktion richten).
 *
 * Legt einen Demo-Nutzer, eine Organisation und einen Kunden an,
 * damit man nach `supabase start` sofort einloggen und die UI sehen kann.
 *
 * Aufruf:  pnpm db:seed
 * Erwartet SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in der Umgebung
 * (Werte liefert `supabase start` bzw. `supabase status`).
 *
 * Login danach: demo@example.com / demo-password-123
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/database.types";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (siehe `supabase status`).",
  );
  process.exit(1);
}

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-password-123";

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureDemoUser(): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (created?.user) return created.user.id;

  // Nutzer existiert bereits → nachschlagen
  if (error) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === DEMO_EMAIL);
    if (existing) return existing.id;
    throw error;
  }
  throw new Error("Demo-Nutzer konnte nicht angelegt werden.");
}

async function main() {
  const userId = await ensureDemoUser();
  console.log(`Demo-Nutzer: ${DEMO_EMAIL} (${userId})`);

  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id, name")
    .eq("slug", "demo-agentur")
    .maybeSingle();

  let orgId: string;
  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`Organisation existiert bereits: ${existingOrg.name}`);
  } else {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: "Demo Agentur", slug: "demo-agentur" })
      .select()
      .single();
    if (orgError) throw orgError;
    orgId = org.id;

    const { error: memberError } = await admin
      .from("organization_members")
      .insert({ organization_id: orgId, user_id: userId, role: "owner" });
    if (memberError) throw memberError;
    console.log(`Organisation angelegt: ${org.name}`);
  }

  const { data: existingClient } = await admin
    .from("clients")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", "Autohaus Huber")
    .maybeSingle();

  if (!existingClient) {
    const { error: clientError } = await admin.from("clients").insert({
      organization_id: orgId,
      name: "Autohaus Huber",
      description: "Familiengeführtes Autohaus in Bayern, Fokus Gebrauchtwagen",
    });
    if (clientError) throw clientError;
    console.log("Kunde angelegt: Autohaus Huber");
  }

  console.log("\nSeed abgeschlossen. Login:");
  console.log(`  E-Mail:   ${DEMO_EMAIL}`);
  console.log(`  Passwort: ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error("Seed fehlgeschlagen:", error);
  process.exit(1);
});
