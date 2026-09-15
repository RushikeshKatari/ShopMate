"use client";

import { useState, useEffect } from "react";
import {
  ReceiptText,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/transactions", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (typeFilter !== "ALL") url.searchParams.set("type", typeFilter);
      if (methodFilter !== "ALL") url.searchParams.set("paymentMethod", methodFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, typeFilter, methodFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Transaction Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete real-time audit log of sales, purchases, khata, and payment entries
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, customer, product..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-700"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="SALE">Cash/UPI Sales</option>
            <option value="CREDIT_SALE">Credit Sales (Khata)</option>
            <option value="PURCHASE">Stock Purchases</option>
            <option value="PAYMENT">Customer Payments</option>
            <option value="PRICE_CHANGE">Price Updates</option>
          </select>
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-700"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CREDIT">Khata Credit</option>
          </select>
        </div>
      </div>

      {/* Transaction List Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                <div className="h-10 w-48 bg-slate-100 rounded" />
                <div className="h-8 w-24 bg-slate-100 rounded" />
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No transactions match your search.
            </div>
          ) : (
            transactions.map((t) => {
              const isPurchase = t.type === "PURCHASE";
              const isCreditSale = t.type === "CREDIT_SALE";
              const isPayment = t.type === "PAYMENT";
              const isSale = t.type === "SALE";

              return (
                <div
                  key={t.id}
                  className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isPurchase
                          ? "bg-slate-100 text-slate-700"
                          : isCreditSale
                          ? "bg-amber-100 text-amber-800"
                          : isPayment
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isPurchase && <TrendingDown className="w-5 h-5" />}
                      {isCreditSale && <ArrowUpRight className="w-5 h-5" />}
                      {isPayment && <CreditCard className="w-5 h-5" />}
                      {isSale && <ArrowDownLeft className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs md:text-sm text-slate-900">
                          {t.description || `${t.type} transaction`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPurchase
                              ? "bg-slate-100 text-slate-700"
                              : isCreditSale
                              ? "bg-amber-100 text-amber-800"
                              : isPayment
                              ? "bg-purple-100 text-purple-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {t.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{formatDateTime(t.createdAt)}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-600">
                          Method: {t.paymentMethod}
                        </span>
                        <span>•</span>
                        <span>Source: {t.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm md:text-base font-black ${
                        isPurchase
                          ? "text-slate-900"
                          : isCreditSale
                          ? "text-amber-700"
                          : isPayment
                          ? "text-purple-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(t.amount)}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      {t.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
