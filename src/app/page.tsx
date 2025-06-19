import Link from "next/link";

export default function Homepage() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center">
      <Link
        href="/login"
        className="mt-3 align-center inline-block rounded-lg bg-sky-500 px-6 py-3 text-center font-semibold text-white shadow transition-colors hover:bg-sky-600"
      >
        Go to Login
      </Link>
    </main>
  );
}
