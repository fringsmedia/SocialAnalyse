"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n/de";

export interface AcceptInviteState {
  error?: string;
}

export async function acceptInviteAction(
  token: string,
): Promise<AcceptInviteState> {
  const m = getMessages();
  const parsed = z.uuid().safeParse(token);
  if (!parsed.success) {
    return { error: m.invite.errors.invalid };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("accept_invite", {
    p_token: parsed.data,
  });

  if (error) {
    if (error.message.includes("email_mismatch")) {
      return { error: m.invite.errors.emailMismatch };
    }
    return { error: m.invite.errors.invalid };
  }

  redirect("/");
}
