"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMessages } from "@/lib/i18n/de";

export interface InviteFormState {
  ok?: boolean;
  inviteLink?: string;
  emailSent?: boolean;
  error?: string;
}

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]),
});

export async function inviteMemberAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const m = getMessages();
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: m.settings.errors.invalidEmail };
  }

  const { supabase, user, org, role } = await getAuthContext();
  if (!user || !org || (role !== "owner" && role !== "admin")) {
    return { error: m.settings.errors.generic };
  }

  const { data: invite, error: insertError } = await supabase
    .from("organization_invites")
    .insert({
      organization_id: org.id,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select("token")
    .single();
  if (insertError || !invite) {
    return { error: m.settings.errors.generic };
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";
  const inviteLink = `${origin}/invite/accept?token=${invite.token}`;

  // E-Mail-Versand (best effort): Supabase verschickt die Einladung;
  // schlägt es fehl (z. B. Nutzer existiert bereits), bleibt der Link.
  let emailSent = false;
  try {
    const admin = createSupabaseAdminClient();
    const { error: mailError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      { redirectTo: inviteLink },
    );
    emailSent = !mailError;
  } catch {
    emailSent = false;
  }

  revalidatePath("/settings");
  return { ok: true, inviteLink, emailSent };
}

export async function revokeInviteAction(inviteId: string): Promise<void> {
  const { supabase, role } = await getAuthContext();
  if (role !== "owner" && role !== "admin") return;
  await supabase.from("organization_invites").delete().eq("id", inviteId);
  revalidatePath("/settings");
}
