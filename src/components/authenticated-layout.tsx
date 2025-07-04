import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import { cookies, headers } from "next/headers";

async function fetchInitialChatHistory(): Promise<any[]> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const headerStore = await headers();
    const host = headerStore.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const res = await fetch(`${protocol}://${host}/api/history`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch {
    return [];
  }
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
