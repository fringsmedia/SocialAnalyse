import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { PRODUCT_NAME } from "@ci/shared";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s – ${PRODUCT_NAME}`,
  },
  description:
    "Die stärksten Ads und Kurzvideos einer Branche finden, Muster verstehen, eigene Creatives ableiten.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={GeistSans.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
