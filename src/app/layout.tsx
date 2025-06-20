import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}
        <Analytics />
      <Toaster />
      </body>
    </html>
  );
}
