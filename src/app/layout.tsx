"use client";

import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await authClient.useSession();
        setIsAuthenticated(!!session?.user);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Don't render anything until we know the auth state
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          {isAuthenticated && (
            <>
              <AppSidebar />
              <SidebarTrigger />
            </>
          )}
          <div className="flex-1">
            <main className="h-full flex-1 flex-col md:flex">{children}</main>
          </div>
          <Analytics />
          <Toaster />
        </SidebarProvider>
      </body>
    </html>
  );
}
