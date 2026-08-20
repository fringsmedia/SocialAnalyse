import { LogoMark } from "@/components/logo";
import { PRODUCT_NAME } from "@ci/shared";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-105">
        <div className="mb-10 flex items-center gap-3">
          <LogoMark />
          <span className="text-[15px] font-medium tracking-tight">
            {PRODUCT_NAME}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
