"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, SUPPORTED_UNITS } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  "General",
  "Grains & Rice",
  "Pulses & Dal",
  "Edible Oils & Ghee",
  "Spices & Masala",
  "Dairy & Eggs",
  "Snacks & Biscuits",
  "Beverages & Tea",
  "Personal Care",
  "Household Cleaning",
  "Dry Fruits & Nuts",
  "Electronics & Appliances",
  "Vegetables & Fruits",
];

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Category selection & custom creation state
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Add Product Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "General",
    unit: "kg",
    currentStock: "10",
    minimumStock: "5",
    purchasePrice: "50",
    sellingPrice: "60",
    profitAmount: "10",
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/products", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (category !== "All") url.searchParams.set("category", category);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const handlePriceChange = (purchase: string, profit: string) => {
    const p = parseFloat(purchase) || 0;
    const m = parseFloat(profit) || 0;
    setFormData((prev) => ({
      ...prev,
      purchasePrice: purchase,
      profitAmount: profit,
      sellingPrice: (p + m).toString(),
    }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const availableCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...products.map((p) => p.category).filter(Boolean),
      ...customCategories,
    ])
  );

  const categories = ["All", ...Array.from(new Set([...products.map((p) => p.category), ...customCategories]))];

  const handleSaveNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    setFormData((prev) => ({ ...prev, category: trimmed }));
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Inventory & Stock
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock levels, purchase & selling prices, and automatic margins
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products (e.g. Rice, Sugar, Oil)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 md:px-6">Product</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Min. Stock</th>
                <th className="py-3.5 px-4">Purchase Price</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Profit</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-6">
                      <div className="h-5 bg-slate-100 rounded" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 md:px-6">
                        <Link
                          href={`/inventory/${p.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[11px] text-slate-400">{p.category}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {p.currentStock} {p.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {p.minimumStock} {p.unit}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {formatCurrency(p.purchasePrice)}/{p.unit}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        {formatCurrency(p.sellingPrice)}/{p.unit}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-emerald-600">
                        +{formatCurrency(p.profitAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/inventory/${p.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Product</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Basmati Rice"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCategory(!isAddingNewCategory);
                        setNewCategoryInput("");
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {isAddingNewCategory ? "← Select Existing" : "+ Add New Category"}
                    </button>
                  </div>

                  {isAddingNewCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveNewCategory();
                          }
                        }}
                        placeholder="Type new category..."
                        autoFocus
                        className="w-full px-3 py-2 text-xs rounded-xl border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/20 font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewCategory}
                        disabled={!newCategoryInput.trim()}
                        className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === "__ADD_NEW__") {
                          setIsAddingNewCategory(true);
                          setNewCategoryInput("");
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="font-bold text-blue-600">
                        + Add New Category...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {SUPPORTED_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Minimum Stock Alert
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.purchasePrice}
                    onChange={(e) => handlePriceChange(e.target.value, formData.profitAmount)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Profit Margin (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.profitAmount}
                    onChange={(e) => handlePriceChange(formData.purchasePrice, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2 p-3 bg-blue-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-900">Calculated Selling Price:</span>
                  <span className="text-base font-black text-blue-700">
                    {formatCurrency(formData.sellingPrice)}/{formData.unit}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
