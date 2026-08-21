import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PLANS, type PlanId } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InvitesPanel } from "./invites-panel";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const { supabase, user, org, role } = await getAuthContext();
  if (!user || !org) redirect("/");
  const m = getMessages();

  const { data: members } = await supabase.rpc("org_members_with_email", {
    p_org_id: org.id,
  });

  const isAdmin = role === "owner" || role === "admin";
  const { data: invites } = isAdmin
    ? await supabase
        .from("organization_invites")
        .select("id, email, role, token, created_at")
        .eq("organization_id", org.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("organization_id", org.id)
    .maybeSingle();
  const plan = PLANS[(subscription?.plan as PlanId) ?? "free"] ?? PLANS.free;

  return (
    <div className="mx-auto max-w-3xl">
      <section className="pb-10 pt-4 md:pt-8">
        <p className="text-[13px] font-medium text-ink-2">
          {m.settings.eyebrow} · {org.name}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight">
          {m.settings.title}
        </h1>
      </section>

      <div className="space-y-5">
        <Card className="p-8">
          <Label>{m.settings.membersTitle}</Label>
          <ul className="mt-5 space-y-4">
            {(members ?? []).map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-4"
              >
                <span className="min-w-0 truncate text-[15px] font-medium">
                  {member.email}
                  {member.user_id === user.id ? (
                    <span className="text-ink-2"> · du</span>
                  ) : null}
                </span>
                <Badge variant={member.role === "member" ? "neutral" : "dark"}>
                  {m.settings.roleLabels[member.role] ?? member.role}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        {isAdmin ? (
          <InvitesPanel invites={invites ?? []} />
        ) : (
          <Card className="p-8">
            <Label>{m.settings.invitesTitle}</Label>
            <p className="mt-3 text-[15px] text-ink-2">
              {m.settings.onlyAdmins}
            </p>
          </Card>
        )}

        <Card className="p-8">
          <div className="flex items-baseline justify-between gap-4">
            <Label>{m.settings.planTitle}</Label>
            <Badge>{plan.label}</Badge>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            {m.settings.planHint}
          </p>
        </Card>
      </div>
    </div>
  );
}
