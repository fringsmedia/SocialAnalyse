"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  createProfileAction,
  type NewAnalysisFormState,
} from "./actions";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  const m = getMessages();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? m.common.loading : m.newAnalysis.submit}
      {pending ? null : <ArrowRight size={16} weight="bold" />}
    </Button>
  );
}

export function NewAnalysisForm({ clientId }: { clientId: string }) {
  const m = getMessages();
  const [state, formAction] = useActionState<NewAnalysisFormState, FormData>(
    createProfileAction,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="clientId" value={clientId} />
      <Field
        label={m.newAnalysis.label}
        htmlFor="description"
        error={state.error}
      >
        <Textarea
          id="description"
          name="description"
          placeholder={m.newAnalysis.placeholder}
          minLength={15}
          maxLength={1000}
          rows={4}
          required
          autoFocus
        />
      </Field>
      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
