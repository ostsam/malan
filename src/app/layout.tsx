import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import LazyToaster from "@/components/LazyToaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <style>{`
          @keyframes spin-slow { 
            from { transform: rotate(0deg);} 
            to { transform: rotate(360deg);} 
          }
          @keyframes pulse-float { 
            0%,100% { transform: translateY(-3%);} 
            50% { transform: translateY(3%);} 
          }
          @keyframes fade-in { 
            from { opacity:0; transform: translateY(6px);} 
            to { opacity:1; transform: translateY(0);} 
          }
        `}</style>
      </head>
      <body className="font-sans relative overflow-hidden min-h-screen bg-white">
        {/* Vivid animated conic gradient */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-20 flex items-center justify-center"
        >
          <div
            className="w-[1600px] h-[1600px] rounded-full blur-[160px] opacity-60 animate-[spin-slow_45s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from_180deg_at_50%_50%,rgba(23,6,100,0.85)_0%,rgba(35,12,120,0.75)_25%,rgba(55,20,140,0.65)_50%,rgba(75,30,160,0.6)_75%,rgba(23,6,100,0.85)_100%)",
            }}
          />
        </div>

        {/* Brighter radial burst (top-left) */}
        <div aria-hidden="true" className="fixed -top-32 -left-48 -z-10">
          <div
            className="w-[650px] h-[650px] rounded-full blur-[90px] opacity-55 animate-[pulse-float_12s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%,rgba(23,6,100,0.85) 0%,rgba(23,6,100,0) 70%)",
            }}
          />
        </div>

        {/* Brighter radial burst (bottom-right) */}
        <div aria-hidden="true" className="fixed bottom-0 right-0 -z-10">
          <div
            className="w-[600px] h-[600px] rounded-full blur-[90px] opacity-50 animate-[pulse-float_14s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle at 70% 70%,rgba(55,20,140,0.75) 0%,rgba(55,20,140,0) 70%)",
              animationDelay: "2s",
            }}
          />
        </div>

        {/* Enhanced fine noise overlay */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 mix-blend-multiply opacity-[0.22]"
          style={{
            backgroundImage:
              "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22%3E%3Crect width=%22160%22 height=%22160%22 fill=%22%23FFFFFF%22/%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%2280%22 cy=%2280%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3Ccircle cx=%22120%22 cy=%22120%22 r=%221.2%22 fill=%22%23170664%22 opacity=%22.1%22/%3E%3C/svg%3E')",
          }}
        />

        {children}
        <Analytics />
        <LazyToaster />
      </body>
    </html>
  );
}
