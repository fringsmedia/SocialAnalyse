"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAction, type AuthFormState } from "../actions";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const m = getMessages();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? m.common.loading : label}
    </Button>
  );
}

export function LoginForm() {
  const m = getMessages();
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signInAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <Field label={m.auth.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={m.auth.emailPlaceholder}
          required
        />
      </Field>
      <Field label={m.auth.password} htmlFor="password" error={state.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={m.auth.passwordPlaceholder}
          required
        />
      </Field>
      <div className="pt-2">
        <SubmitButton label={m.auth.submitLogin} />
      </div>
    </form>
  );
}
