"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  Clock,
  History,
  Edit,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adjustAmount, setAdjustAmount] = useState<string>("5");
  const [adjusting, setAdjusting] = useState(false);
  const [newSellingPrice, setNewSellingPrice] = useState<string>("");

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        setNewSellingPrice(data.product.sellingPrice?.toString() || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const handleStockAdjust = async (change: number) => {
    try {
      setAdjusting(true);
      const res = await fetch(`/api/products/${id}/stock-adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityChange: change,
          type: change > 0 ? "PURCHASE" : "SALE",
        }),
      });
      if (res.ok) {
        fetchProduct();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdjusting(false);
    }
  };

  const handlePriceUpdate = async () => {
    try {
      const p = parseFloat(newSellingPrice);
      if (isNaN(p) || p <= 0) return;

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellingPrice: p,
          profitAmount: p - (product?.purchasePrice || 0),
        }),
      });

      if (res.ok) {
        fetchProduct();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !product) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  const isLow = product.currentStock <= product.minimumStock;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/inventory"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Inventory</span>
      </Link>

      {/* Main Product Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {product.name}
              </h2>
              {isLow ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Low Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Healthy
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Category: {product.category}</p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Current Stock</span>
            <span className="text-3xl font-black text-slate-900">
              {product.currentStock}{" "}
              <span className="text-sm font-normal text-slate-500">{product.unit}</span>
            </span>
          </div>
        </div>

        {/* Pricing & Threshold Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-xs text-slate-500 block">Selling Price</span>
            <span className="text-xl font-bold text-blue-700">
              {formatCurrency(product.sellingPrice)}
              <span className="text-xs text-slate-400 font-normal">/{product.unit}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-xs text-slate-500 block">Purchase Price</span>
            <span className="text-xl font-bold text-slate-800">
              {formatCurrency(product.purchasePrice)}
              <span className="text-xs text-slate-400 font-normal">/{product.unit}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
            <span className="text-xs text-emerald-700 block font-medium">Profit Margin</span>
            <span className="text-xl font-bold text-emerald-700">
              +{formatCurrency(product.profitAmount)}
              <span className="text-xs text-emerald-600 font-normal">/{product.unit}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-xs text-slate-500 block">Minimum Alert</span>
            <span className="text-xl font-bold text-slate-800">
              {product.minimumStock}{" "}
              <span className="text-xs text-slate-400 font-normal">{product.unit}</span>
            </span>
          </div>
        </div>

        {/* Quick Stock & Price Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* Stock Adjuster */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Adjust Stock Level
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStockAdjust(-1)}
                disabled={adjusting || product.currentStock < 1}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 disabled:opacity-50"
                title="Decrease 1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStockAdjust(-5)}
                disabled={adjusting || product.currentStock < 5}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 disabled:opacity-50"
              >
                -5 {product.unit}
              </button>
              <button
                onClick={() => handleStockAdjust(5)}
                disabled={adjusting}
                className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold active:scale-95"
              >
                +5 {product.unit}
              </button>
              <button
                onClick={() => handleStockAdjust(10)}
                disabled={adjusting}
                className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold active:scale-95"
              >
                +10 {product.unit}
              </button>
            </div>
          </div>

          {/* Direct Price Update */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Change Selling Price
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newSellingPrice}
                onChange={(e) => setNewSellingPrice(e.target.value)}
                placeholder="New Price"
                className="w-32 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePriceUpdate}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Inventory Movements */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <span>Inventory Movement Ledger</span>
          </h3>
          <span className="text-xs text-slate-400">Auditable stock trail</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(product.inventoryMovements || []).length === 0 ? (
            <div className="py-6 text-center text-slate-400">No inventory movements recorded yet.</div>
          ) : (
            product.inventoryMovements.map((m: any) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        m.type === "PURCHASE"
                          ? "bg-emerald-100 text-emerald-800"
                          : m.type === "SALE"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {m.type}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {m.type === "PURCHASE" ? "+" : "-"}
                      {m.quantity} {product.unit}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Stock went from {m.previousStock} → {m.newStock} {product.unit}
                  </span>
                </div>

                <div className="text-right text-slate-400 font-medium">
                  {formatDateTime(m.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
