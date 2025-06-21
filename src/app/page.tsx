import { auth } from "@/app/api/auth/[...all]/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Homepage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="flex h-dvh flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to Malan
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Your friendly AI-powered foreign language conversation partner.
        </p>
        <div className="mt-10 flex items-center justify-center">
          <Link
            href="/login"
            className="rounded-md bg-sky-500 px-4 py-3 text-lg font-semibold text-white shadow-sm hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
