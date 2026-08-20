import type { Metadata } from "next";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./form";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  const m = getMessages();
  return (
    <Card className="p-8 md:p-10">
      <h1 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
        {m.auth.registerTitle}
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">{m.auth.registerSubtitle}</p>
      <RegisterForm />
      <p className="mt-8 text-[15px] text-ink-2">
        {m.auth.hasAccount}{" "}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
        >
          {m.auth.toLogin}
        </Link>
      </p>
    </Card>
  );
}
