import type { Metadata } from "next";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  const m = getMessages();
  return (
    <Card className="p-8 md:p-10">
      <h1 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
        {m.auth.loginTitle}
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">{m.auth.loginSubtitle}</p>
      <LoginForm />
      <p className="mt-8 text-[15px] text-ink-2">
        {m.auth.noAccount}{" "}
        <Link
          href="/register"
          className="font-medium text-ink underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
        >
          {m.auth.toRegister}
        </Link>
      </p>
    </Card>
  );
}
