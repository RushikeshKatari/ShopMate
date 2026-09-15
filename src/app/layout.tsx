import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "ShopMate — AI-Powered Digital Employee for Kirana & Retail Shops",
  description:
    "Speak naturally to manage inventory, purchases, sales, pricing, and khata balances.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navigation />
          {/* Main content wrapper with desktop left offset for sidebar */}
          <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-6">
            <Header />
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
