"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, X } from "@phosphor-icons/react/dist/ssr";
import { getMessages } from "@/lib/i18n/de";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteMemberAction,
  revokeInviteAction,
  type InviteFormState,
} from "./actions";

interface InviteRow {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const m = getMessages();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? m.common.loading : m.settings.inviteSubmit}
    </Button>
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const m = getMessages();
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="subtle"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
      {copied ? m.settings.inviteCopied : m.settings.inviteLinkCopy}
    </Button>
  );
}

export function InvitesPanel({ invites }: { invites: InviteRow[] }) {
  const m = getMessages();
  const [role, setRole] = React.useState("member");
  const [state, formAction] = useActionState<InviteFormState, FormData>(
    inviteMemberAction,
    {},
  );
  const [pendingRevoke, startTransition] = React.useTransition();

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Card className="p-8">
      <Label>{m.settings.invitesTitle}</Label>
      <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-ink-2">
        {m.settings.inviteHint}
      </p>

      <form action={formAction} className="mt-5 flex flex-wrap items-center gap-3">
        <Input
          name="email"
          type="email"
          required
          placeholder={m.settings.inviteEmailPlaceholder}
          aria-label={m.settings.inviteEmail}
          className="h-11 w-64"
        />
        <input type="hidden" name="role" value={role} />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger aria-label={m.settings.inviteRole}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">
              {m.settings.roleLabels.member}
            </SelectItem>
            <SelectItem value="admin">{m.settings.roleLabels.admin}</SelectItem>
          </SelectContent>
        </Select>
        <SubmitButton />
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 text-[13px] font-medium text-accent">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[20px] bg-surface-2/60 p-4">
          <p className="text-[13px] font-medium">
            {state.emailSent
              ? m.settings.inviteEmailSent
              : m.settings.inviteEmailFailed}
          </p>
          {state.inviteLink ? <CopyLinkButton link={state.inviteLink} /> : null}
        </div>
      ) : null}

      {invites.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <span className="min-w-0 truncate text-[15px] font-medium">
                {invite.email}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="neutral">
                  {m.settings.roleLabels[invite.role] ?? invite.role}
                </Badge>
                <Badge variant="neutral">{m.settings.invitePending}</Badge>
                <CopyLinkButton
                  link={`${origin}/invite/accept?token=${invite.token}`}
                />
                <Button
                  variant="ghost"
                  size="iconSm"
                  disabled={pendingRevoke}
                  aria-label={m.settings.inviteRevoke}
                  title={m.settings.inviteRevoke}
                  onClick={() =>
                    startTransition(async () => {
                      await revokeInviteAction(invite.id);
                    })
                  }
                >
                  <X size={14} weight="bold" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
