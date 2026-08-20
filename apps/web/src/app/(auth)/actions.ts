"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n/de";

export interface AuthFormState {
  error?: string;
  info?: string;
}

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const m = getMessages();
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: m.auth.errors.invalidCredentials };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: m.auth.errors.invalidCredentials };
  }

  redirect("/");
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const m = getMessages();
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.some((i) =>
      i.path.includes("password"),
    );
    return {
      error: passwordIssue
        ? m.auth.errors.weakPassword
        : m.auth.errors.generic,
    };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: m.auth.errors.emailInUse };
    }
    if (error.code === "weak_password") {
      return { error: m.auth.errors.weakPassword };
    }
    return { error: m.auth.errors.generic };
  }

  // Lokal (Bestätigung aus): Session ist sofort da → weiter zum Onboarding.
  if (data.session) {
    redirect("/onboarding");
  }

  // Cloud (Bestätigung an): Hinweis aufs Postfach.
  return { info: m.auth.confirmEmailSent };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
