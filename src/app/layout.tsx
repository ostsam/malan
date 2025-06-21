import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppSidebar />
          <SidebarTrigger />
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
