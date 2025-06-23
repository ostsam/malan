import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
