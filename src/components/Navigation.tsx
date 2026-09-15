"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  Package,
  Users,
  ReceiptText,
  QrCode,
  Settings,
  Wifi,
  WifiOff,
  Sparkles,
  BrainCircuit,
  Presentation,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/voice", label: "Voice Assistant", icon: Mic, highlight: true },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Khata", icon: Users },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/payments", label: "UPI Payments", icon: QrCode },
  { href: "/intelligence", label: "AI Intelligence", icon: BrainCircuit, highlight: true },
  { href: "/pitch", label: "Pitch Deck", icon: Presentation },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Hide navigation on auth pages
  if (pathname === "/login" || pathname === "/register" || pathname === "/pitch") {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen fixed top-0 left-0 bottom-0 z-30 shadow-sm">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                S
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Shop<span className="text-blue-600">Mate</span>
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              AI Digital Employee
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150",
                  isActive
                    ? item.highlight
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold"
                      : "bg-blue-50 text-blue-700 font-semibold"
                    : item.highlight
                    ? "bg-blue-50/70 text-blue-700 hover:bg-blue-100/70 font-semibold border border-blue-200/60"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive ? (item.highlight ? "text-white" : "text-blue-600") : "text-slate-400",
                    item.highlight && "scale-110"
                  )}
                />
                <span>{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    Voice
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Connectivity Status & Store Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Offline Ready
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">v1.0 MVP</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/50 text-[11px] text-slate-500 truncate font-medium">
            Ramesh Kirana Store
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar with Prominent Voice Mic */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-1.5 px-3 flex items-center justify-around z-40 shadow-lg">
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            pathname === "/dashboard" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/inventory"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            pathname.startsWith("/inventory") ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Package className="w-5 h-5" />
          <span>Stock</span>
        </Link>

        {/* Central Prominent Floating Mic Button */}
        <Link
          href="/voice"
          className="relative -top-5 flex flex-col items-center group"
          aria-label="Speak to ShopMate"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 border-4 border-white transform transition-transform group-hover:scale-105 active:scale-95">
            <Mic className="w-7 h-7 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-blue-700 mt-0.5">Speak</span>
        </Link>

        <Link
          href="/customers"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            pathname.startsWith("/customers") ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Users className="w-5 h-5" />
          <span>Khata</span>
        </Link>

        <Link
          href="/intelligence"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            pathname === "/intelligence" || pathname === "/settings" || pathname === "/transactions" || pathname === "/payments"
              ? "text-blue-600 font-bold"
              : "text-slate-500 hover:text-slate-900"
          )}
        >
          <BrainCircuit className="w-5 h-5" />
          <span>AI</span>
        </Link>
      </nav>
    </>
  );
}
