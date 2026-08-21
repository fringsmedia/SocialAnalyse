"use client";

import * as React from "react";
import { acceptInviteAction } from "./actions";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";

export function AcceptInviteForm({ token }: { token: string }) {
  const m = getMessages();
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="mt-8">
      {error ? (
        <p role="alert" className="mb-4 text-[13px] font-medium text-accent">
          {error}
        </p>
      ) : null}
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInviteAction(token);
            if (result?.error) setError(result.error);
          })
        }
      >
        {pending ? m.common.loading : m.invite.accept}
      </Button>
    </div>
  );
}
