import { auth } from "@/app/api/auth/[...all]/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function Homepage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="flex h-dvh flex-col items-center justify-center p-4">
      <div>
        <Image
          src="/logo.svg"
          alt="Logo"
          className="h-50 w-auto"
          width={200}
          height={80}
        />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to Malan
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Your friendly AI-powered foreign language conversation partner.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-1.5">
          <Link
            href="/login"
            className="rounded-md px-4 py-3 text-lg font-semibold text-white shadow-sm hover:bg-[#120b4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3C18D9]"
            style={{ backgroundColor: "#3C18D9" }}
          >
            Get Started
          </Link>
          <Link
            href="/demo"
            className="rounded-md bg-white px-4 py-3 text-lg font-semibold shadow-sm ring-1 ring-[#3C18D9] hover:bg-[#edebf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3C18D9]"
            style={{ color: "#3C18D9" }}
          >
            Try Malan
          </Link>
        </div>
      </div>
    </main>
  );
}
