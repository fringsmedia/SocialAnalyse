"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { createClientAction, type ClientFormState } from "./actions";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  const m = getMessages();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? m.common.loading : m.common.create}
    </Button>
  );
}

export function NewClientDialog({
  triggerLabel,
  triggerVariant = "primary",
}: {
  triggerLabel: string;
  triggerVariant?: "primary" | "dark";
}) {
  const m = getMessages();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ClientFormState, FormData>(
    createClientAction,
    {},
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="lg">
          <Plus size={16} weight="bold" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{m.clientDialog.title}</DialogTitle>
        <form action={formAction} className="mt-8 space-y-5">
          <Field
            label={m.clientDialog.name}
            htmlFor="client-name"
            error={state.error}
          >
            <Input
              id="client-name"
              name="name"
              placeholder={m.clientDialog.namePlaceholder}
              minLength={2}
              maxLength={120}
              required
              autoFocus
            />
          </Field>
          <Field label={m.clientDialog.description} htmlFor="client-description">
            <Textarea
              id="client-description"
              name="description"
              placeholder={m.clientDialog.descriptionPlaceholder}
              maxLength={500}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="lg" onClick={() => setOpen(false)}>
              {m.common.cancel}
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
