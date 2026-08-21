import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_NAME } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/logo";
import { AcceptInviteForm } from "./form";

export const metadata: Metadata = { title: "Einladung" };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { user } = await getAuthContext();
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
            {m.invite.title}
          </h1>
          {!token ? (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              {m.invite.errors.invalid}
            </p>
          ) : user ? (
            <>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                {m.invite.loggedInText}
              </p>
              <AcceptInviteForm token={token} />
            </>
          ) : (
            <>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                {m.invite.loggedOutText}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/login">{m.invite.toLogin}</Link>
                </Button>
                <Button variant="dark" size="lg" asChild>
                  <Link href="/register">{m.invite.toRegister}</Link>
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
