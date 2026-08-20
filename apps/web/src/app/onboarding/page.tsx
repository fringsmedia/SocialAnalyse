import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRODUCT_NAME } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/logo";
import { OnboardingForm } from "./form";

export const metadata: Metadata = { title: "Organisation anlegen" };

export default async function OnboardingPage() {
  const { user, org } = await getAuthContext();
  if (!user) redirect("/login");
  if (org) redirect("/");

  const m = getMessages();

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-105">
        <div className="mb-10 flex items-center gap-3">
          <LogoMark />
          <span className="text-[15px] font-medium tracking-tight">
            {PRODUCT_NAME}
          </span>
        </div>
        <Card className="p-8 md:p-10">
          <h1 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
            {m.onboarding.title}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {m.onboarding.subtitle}
          </p>
          <OnboardingForm />
        </Card>
      </div>
    </div>
  );
}
