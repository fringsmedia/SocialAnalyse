"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@ci/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n/de";

export interface OnboardingFormState {
  error?: string;
}

const schema = z.object({ name: z.string().trim().min(2).max(80) });

export async function createOrganizationAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const m = getMessages();
  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: m.onboarding.errors.nameTooShort };
  }

  const supabase = await createSupabaseServerClient();
  const baseSlug = slugify(parsed.data.name) || "organisation";

  // Slug-Kollision: einmal mit Zufalls-Suffix nachfassen.
  const candidates = [
    baseSlug,
    `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`,
  ];

  for (const slug of candidates) {
    const { error } = await supabase.rpc("create_organization", {
      p_name: parsed.data.name,
      p_slug: slug,
    });
    if (!error) {
      redirect("/");
    }
    // 23505 = unique_violation (Slug vergeben) → nächsten Kandidaten testen
    if (error.code !== "23505") {
      return { error: m.onboarding.errors.generic };
    }
  }

  return { error: m.onboarding.errors.generic };
}
