import Link from "next/link";
import { redirect } from "next/navigation";
import { GearSix, SignOut } from "@phosphor-icons/react/dist/ssr";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "../(auth)/actions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, org } = await getAuthContext();
  if (!user) redirect("/login");
  if (!org) redirect("/onboarding");

  const m = getMessages();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-300 px-6 md:px-10">
      <header className="flex items-center justify-between py-7">
        <Link
          href="/"
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden h-9 items-center rounded-full bg-surface-2 px-4 text-sm font-medium sm:inline-flex">
            {org.name}
          </span>
          <Button variant="ghost" size="iconSm" asChild>
            <Link
              href="/settings"
              title={m.common.settings}
              aria-label={m.common.settings}
            >
              <GearSix size={18} />
            </Link>
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="iconSm"
              title={m.common.signOut}
              aria-label={m.common.signOut}
            >
              <SignOut size={18} />
            </Button>
          </form>
        </div>
      </header>
      <main className="pb-24">{children}</main>
    </div>
  );
}
