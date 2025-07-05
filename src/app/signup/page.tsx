"use client";

import { SignUpForm } from "@/components/signup-form";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const fromDemo = searchParams.get("from") === "demo";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <a href="/" className="flex items-center self-center font-medium">
          <img src="/malan-caps.svg" alt="Malan" className="h-12 w-auto" />
        </a>
        <SignUpForm fromDemo={fromDemo} />
      </div>
    </div>
  );
}
