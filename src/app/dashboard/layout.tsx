"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/');
    }
  }, [session, isPending, router]);

  if (isPending || !session?.user) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex">
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1">
          {children}
        </div>
      </SidebarProvider>
    </div>
  );
}
