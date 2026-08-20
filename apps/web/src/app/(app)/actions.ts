"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";

export interface ClientFormState {
  ok?: boolean;
  error?: string;
}

const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v.length === 0 ? null : v)),
});

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const m = getMessages();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { error: m.clientDialog.errors.nameTooShort };
  }

  const { supabase, user, org } = await getAuthContext();
  if (!user || !org) {
    return { error: m.clientDialog.errors.generic };
  }

  const { error } = await supabase.from("clients").insert({
    organization_id: org.id,
    name: parsed.data.name,
    description: parsed.data.description,
  });

  if (error) {
    return { error: m.clientDialog.errors.generic };
  }

  revalidatePath("/");
  return { ok: true };
}
