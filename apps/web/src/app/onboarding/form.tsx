"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createOrganizationAction,
  type OnboardingFormState,
} from "./actions";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  const m = getMessages();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? m.common.loading : m.onboarding.submit}
    </Button>
  );
}

export function OnboardingForm() {
  const m = getMessages();
  const [state, formAction] = useActionState<OnboardingFormState, FormData>(
    createOrganizationAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <Field label={m.onboarding.orgName} htmlFor="name" error={state.error}>
        <Input
          id="name"
          name="name"
          placeholder={m.onboarding.orgNamePlaceholder}
          minLength={2}
          maxLength={80}
          required
          autoFocus
        />
      </Field>
      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
