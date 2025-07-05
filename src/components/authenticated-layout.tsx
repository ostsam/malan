import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex">
        <AppSidebar />
        <SidebarTrigger />
        <div className="flex-1">
          <main className="h-full flex-1 flex-col md:flex">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
