import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import { cookies, headers } from "next/headers";

/**
 * Server-side layout that pre-fetches the user's chat history before
 * rendering the sidebar. NOTE: this file is suffixed with `.server.tsx`
 * so that Next.js and ESLint treat it as a server component, allowing
 * the use of `next/headers` and `next/cookies` without client-bundle
 * or lint violations.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function fetchInitialChatHistory(): Promise<any[]> {
    try {
      // Combine all cookies into a single header so that the server request to
      // `/api/history` is authenticated for the current user.
      const cookieStore = await cookies();
      const cookieHeader = cookieStore
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join("; ");

      // Resolve correct host (local, Vercel preview or production).
      const hostHeaders = await headers();
      const host = hostHeaders.get("host") || "localhost:3000";
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

      const res = await fetch(`${protocol}://${host}/api/history`, {
        headers: { Cookie: cookieHeader },
        cache: "no-store", // always fresh for logged-in user
        next: { revalidate: 0 }, // Ensure no caching
      });

      if (!res.ok) return [];
      const data = await res.json();
      return data.sessions || [];
    } catch {
      return [];
    }
  }

  const initialChatHistory = await fetchInitialChatHistory();

  return (
    <SidebarProvider>
      <div className="flex">
        {/* Pass pre-fetched history as prop to the client sidebar */}
        <AppSidebar initialChatHistory={initialChatHistory} />
        <SidebarTrigger />
        <div className="flex-1">
          <main className="h-full flex-1 flex-col md:flex">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
