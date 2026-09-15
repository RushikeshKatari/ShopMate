"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  Banknote,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Package,
  Mic,
  Users,
  Plus,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-3xl" />
          <div className="h-64 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  const today = data?.today || {
    totalSales: 0,
    creditSales: 0,
    cashUpiSales: 0,
    lowStockCount: 0,
    totalOutstandingKhata: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Voice Prompt */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Voice-First Assistant Active
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Ready to take orders, Ramesh ji.
            </h2>
            <p className="text-xs md:text-sm text-blue-100 max-w-xl">
              Speak naturally to record purchases, sales, pricing, or khata balances. The dashboard verifies your business in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/voice"
              className="px-5 py-3 rounded-2xl bg-white text-blue-700 font-bold text-sm shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2.5 active:scale-95 shrink-0"
            >
              <Mic className="w-5 h-5 text-blue-600 animate-bounce" />
              <span>Start Speaking</span>
            </Link>
            <button
              onClick={fetchDashboard}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors shrink-0"
              title="Refresh overview"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Today's Overview Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">
            Today's Overview
          </h3>
          <span className="text-xs text-slate-400 font-medium">Auto-calculated live</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {/* Total Sales */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Sales</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(today.totalSales)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Today's Gross Sales
            </div>
          </div>

          {/* Credit Sales */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Credit Sales</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(today.creditSales)}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">
              Recorded on Khata
            </div>
          </div>

          {/* Cash / UPI */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Cash / UPI</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(today.cashUpiSales)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Instant Received
            </div>
          </div>

          {/* Low Stock Items */}
          <Link
            href="/inventory"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Low Stock</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
              {today.lowStockCount}
              <span className="text-xs font-normal text-slate-500">items</span>
            </div>
            <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
              <span>Action needed</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Total Outstanding Khata */}
          <Link
            href="/customers"
            className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Outstanding Khata</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(today.totalOutstandingKhata)}
            </div>
            <div className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
              <span>View all khata</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* Main Two Columns: Inventory Snapshot & Khata Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Snapshot */}
        <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">Inventory Status</h4>
                  <p className="text-xs text-slate-400">Current stock & selling prices</p>
                </div>
              </div>
              <Link
                href="/inventory"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {(data?.topInventory || []).slice(0, 5).map((p: any) => {
                const isLow = p.currentStock <= p.minimumStock;
                return (
                  <Link
                    key={p.id}
                    href={`/inventory/${p.id}`}
                    className="py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </span>
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            Healthy
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        Selling: {formatCurrency(p.sellingPrice)}/{p.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        {p.currentStock} {p.unit}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Min: {p.minimumStock} {p.unit}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Need to add fresh stock?
            </span>
            <Link
              href="/inventory"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
        </div>

        {/* Khata Customers Snapshot */}
        <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">Khata / Credit Balances</h4>
                  <p className="text-xs text-slate-400">Top pending customer payments</p>
                </div>
              </div>
              <Link
                href="/customers"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <span>All Customers</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {(data?.topKhataCustomers || []).slice(0, 5).map((c: any) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold text-sm flex items-center justify-center">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-800 group-hover:text-purple-600 transition-colors block">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {c.phone ? `+91 ${c.phone}` : "Verified customer"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-purple-700">
                      {formatCurrency(c.outstandingBalance)}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                      Pending
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Collect payment via UPI QR code
            </span>
            <Link
              href="/payments"
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              <span>Open UPI Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Voice Demo Helpers Bar */}
      <div className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h5 className="font-bold text-sm text-blue-950 flex items-center gap-2">
            <Mic className="w-4 h-4 text-blue-600" />
            <span>Try speaking these commands:</span>
          </h5>
          <p className="text-xs text-blue-800/80 mt-0.5">
            &ldquo;I bought 10 kilos of rice for ₹520&rdquo; • &ldquo;I want ₹10 profit per kilo on rice&rdquo; • &ldquo;Ramesh took 2 kilos of rice on khata&rdquo;
          </p>
        </div>
        <Link
          href="/voice"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-md shadow-blue-500/20"
        >
          Open Voice Room
        </Link>
      </div>
    </div>
  );
}
