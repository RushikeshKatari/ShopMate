"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Split,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Sliders,
  Layers,
  Check,
  Tag,
  Store,
  Barcode,
  Search,
  Share2,
  ChevronDown,
  Phone,
} from "lucide-react";
import { formatCurrency, SUPPORTED_UNITS } from "@/lib/utils";

// Spec Example Scenarios from Section 5 of SmartCheckout Enterprise
const SPEC_PRESETS = [
  {
    id: "case-1",
    label: "Case 1: Standard Fit (₹1,800)",
    desc: "₹500 + ₹600 + ₹700 fits in 1 standard bill (≤ ₹1,999)",
    items: [
      { name: "Cooking Oil 500ml", unitPrice: 500, quantity: 1 },
      { name: "Basmati Rice 5kg", unitPrice: 600, quantity: 1 },
      { name: "Toor Dal 5kg", unitPrice: 700, quantity: 1 },
    ],
  },
  {
    id: "case-2",
    label: "Case 2: Best-Fit Split (₹2,400)",
    desc: "₹1,000 + ₹900 + ₹500 → Bill 1: ₹1,900, Bill 2: ₹500",
    items: [
      { name: "Dry Fruits Pack", unitPrice: 1000, quantity: 1 },
      { name: "Pure Ghee 1L", unitPrice: 900, quantity: 1 },
      { name: "Sunflower Oil 2L", unitPrice: 500, quantity: 1 },
    ],
  },
  {
    id: "case-3",
    label: "Case 3: High-Value + Standard (₹4,600)",
    desc: "TV ₹2,500 (Standalone) + ₹500 + ₹700 + ₹900 (Bill 1: ₹1,900)",
    items: [
      { name: "Smart TV Display", unitPrice: 2500, quantity: 1 },
      { name: "Tea Powder", unitPrice: 500, quantity: 1 },
      { name: "Sugar 10kg", unitPrice: 700, quantity: 1 },
      { name: "Spice Jar Assorted", unitPrice: 900, quantity: 1 },
    ],
  },
  {
    id: "case-4",
    label: "Case 4: Multi High-Value (₹9,700)",
    desc: "Bill 1: ₹2,500, Bill 2: ₹5,000, Bill 3: ₹1,200 (300+400+500)",
    items: [
      { name: "Microwave Oven", unitPrice: 2500, quantity: 1 },
      { name: "Smart Refrigerator Component", unitPrice: 5000, quantity: 1 },
      { name: "Washing Detergent", unitPrice: 300, quantity: 1 },
      { name: "Personal Care Kit", unitPrice: 400, quantity: 1 },
      { name: "Olive Oil 500ml", unitPrice: 500, quantity: 1 },
    ],
  },
  {
    id: "case-5",
    label: "Case 5: Exact ₹1,999 Threshold",
    desc: "Single item ₹1,999 → Exactly one bill of ₹1,999",
    items: [{ name: "Induction Cooktop", unitPrice: 1999, quantity: 1 }],
  },
  {
    id: "case-6",
    label: "Case 6: Exact ₹2,000 Boundary",
    desc: "Item at ₹2,000 handled according to boundary rule policy",
    items: [{ name: "Grinder Appliance", unitPrice: 2000, quantity: 1 }],
  },
  {
    id: "case-7",
    label: "Case 7: Duplicate High-Value (₹2,500 × 2)",
    desc: "Two separate standalone bills, never combined",
    items: [{ name: "Soundbar Speaker", unitPrice: 2500, quantity: 2 }],
  },
];

// Quick presets for common unbarcoded / loose kirana staples
const LOOSE_PRESETS = [
  { name: "Loose Basmati Rice", unitPrice: 60, unit: "kg", category: "Grains & Rice", icon: "🌾" },
  { name: "Loose Sugar", unitPrice: 45, unit: "kg", category: "General", icon: "🍚" },
  { name: "Loose Toor Dal", unitPrice: 140, unit: "kg", category: "Pulses & Dal", icon: "🥣" },
  { name: "Fresh Potatoes", unitPrice: 30, unit: "kg", category: "Vegetables & Fruits", icon: "🥔" },
  { name: "Fresh Onions", unitPrice: 35, unit: "kg", category: "Vegetables & Fruits", icon: "🧅" },
  { name: "Farm Fresh Eggs (6pcs)", unitPrice: 42, unit: "box", category: "Dairy & Eggs", icon: "🥚" },
  { name: "Fresh Milk Pouch 500ml", unitPrice: 30, unit: "packet", category: "Dairy & Eggs", icon: "🥛" },
  { name: "Fresh Coriander Bunch", unitPrice: 15, unit: "piece", category: "Vegetables & Fruits", icon: "🌿" },
];

const DEFAULT_CATEGORIES = [
  "General",
  "Grains & Rice",
  "Pulses & Dal",
  "Edible Oils & Ghee",
  "Spices & Masala",
  "Dairy & Eggs",
  "Snacks & Biscuits",
  "Beverages & Tea",
  "Personal Care & Soaps",
  "Household Cleaning",
  "Dry Fruits & Nuts",
  "Electronics & Appliances",
  "Vegetables & Fruits",
];

function PaymentsContent() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";
  const initialAmount = searchParams.get("amount") || "";

  // Mode: "smart-checkout" vs "single-khata"
  const [terminalMode, setTerminalMode] = useState<"smart-checkout" | "single-khata">(
    "smart-checkout"
  );

  // 1. SMARTCHECKOUT STATE
  const [cartItems, setCartItems] = useState<
    {
      id: string;
      name: string;
      unitPrice: number;
      quantity: number;
      unit?: string;
      category?: string;
      isUnbarcoded?: boolean;
    }[]
  >(
    SPEC_PRESETS[2].items.map((it, idx) => ({
      ...it,
      id: `item-${idx + 1}`,
      unit: "item",
      category: "General",
      isUnbarcoded: false,
    }))
  );

  // Keep the item-entry tools out of the way until the cashier needs one.
  const [expandedEntryPanel, setExpandedEntryPanel] = useState<"manual_loose" | "barcode" | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");

  // Manual / Loose product fields
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("kg");
  const [newItemCategory, setNewItemCategory] = useState("General");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Store inventory products for quick loose lookup
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);

  const availableCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...inventoryProducts.map((p) => p.category).filter(Boolean),
      ...customCategories,
    ])
  );

  const handleSaveNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    setNewItemCategory(trimmed);
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
  };

  // Configurable thresholds
  const [maxBucketValue, setMaxBucketValue] = useState<number>(1999);
  const [highValueThreshold, setHighValueThreshold] = useState<number>(2000);
  const [boundaryRule, setBoundaryRule] = useState<"GREATER_THAN" | "GREATER_THAN_OR_EQUAL">(
    "GREATER_THAN"
  );

  const [generatingBills, setGeneratingBills] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [activeInvoiceIndex, setActiveInvoiceIndex] = useState<number>(0);
  const [simulatingPaymentId, setSimulatingPaymentId] = useState<string | null>(null);
  const [invoiceCustomerName, setInvoiceCustomerName] = useState("");
  const [invoiceCustomerPhone, setInvoiceCustomerPhone] = useState("");
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [sendingInvoicePdf, setSendingInvoicePdf] = useState(false);

  // 2. KHATA SETTLEMENT STATE
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [amount, setAmount] = useState(initialAmount);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Single UPI QR state
  const [singleUpiData, setSingleUpiData] = useState<any>(null);
  const [generatingSingleQR, setGeneratingSingleQR] = useState(false);
  const [simulatingSingle, setSimulatingSingle] = useState(false);
  const [singlePaymentSuccess, setSinglePaymentSuccess] = useState<any>(null);
  const [singleQrError, setSingleQrError] = useState<string | null>(null);

  // Load store inventory & customers
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingCustomers(true);
        const [custRes, prodRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products"),
        ]);

        if (custRes.ok) {
          const data = await custRes.json();
          const list = data.customers || [];
          setCustomers(list);

          if (initialCustomerId) {
            const match = list.find((c: any) => c.id === initialCustomerId);
            if (match) setSelectedCustomer(match);
          } else if (list.length > 0) {
            const withBalance = list.find((c: any) => c.outstandingBalance > 0) || list[0];
            setSelectedCustomer(withBalance);
            setAmount(withBalance.outstandingBalance.toString());
          }
        }

        if (prodRes.ok) {
          const pData = await prodRes.json();
          setInventoryProducts(pData.products || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadData();
  }, [initialCustomerId]);

  // Cart operations
  const handleAddManualItem = () => {
    const price = parseFloat(newItemPrice);
    const qty = parseFloat(newItemQty);
    if (!newItemName.trim() || isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      return;
    }
    setCartItems((prev) => [
      ...prev,
      {
        id: `loose-${Date.now()}`,
        name: newItemName.trim(),
        unitPrice: price,
        quantity: qty,
        unit: newItemUnit,
        category: newItemCategory,
        isUnbarcoded: true,
      },
    ]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
    setCheckoutSession(null);
  };

  const handleSelectLoosePreset = (preset: (typeof LOOSE_PRESETS)[0]) => {
    setNewItemName(preset.name);
    setNewItemPrice(preset.unitPrice.toString());
    setNewItemUnit(preset.unit);
    setNewItemCategory(preset.category);
  };

  const handleSelectInventoryProduct = (prodId: string) => {
    if (!prodId) return;
    const prod = inventoryProducts.find((p) => p.id === prodId);
    if (!prod) return;
    setNewItemName(prod.name);
    setNewItemPrice(prod.sellingPrice?.toString() || "");
    setNewItemCategory(prod.category || "General");
    setNewItemUnit(prod.unit || "kg");
  };

  const handleScanOrBarcodeAdd = () => {
    const code = barcodeInput.trim();
    if (!code) return;

    // Look for matching product in inventory by ID or name
    const matched = inventoryProducts.find(
      (p) =>
        p.id === code ||
        p.name.toLowerCase() === code.toLowerCase() ||
        p.name.toLowerCase().includes(code.toLowerCase())
    );

    if (matched) {
      setCartItems((prev) => [
        ...prev,
        {
          id: `scanned-${Date.now()}`,
          name: matched.name,
          unitPrice: matched.sellingPrice || 50,
          quantity: 1,
          unit: matched.unit || "piece",
          category: matched.category || "General",
          isUnbarcoded: false,
        },
      ]);
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          id: `barcode-${Date.now()}`,
          name: `Barcoded Product (${code})`,
          unitPrice: 150,
          quantity: 1,
          unit: "piece",
          category: "General",
          isUnbarcoded: false,
        },
      ]);
    }
    setBarcodeInput("");
    setCheckoutSession(null);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = Math.max(0.1, Math.round((it.quantity + delta) * 100) / 100);
            return { ...it, quantity: nextQty };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
    setCheckoutSession(null);
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
    setCheckoutSession(null);
  };

  const handleApplyPreset = (presetId: string) => {
    const found = SPEC_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCartItems(
        found.items.map((it, idx) => ({
          ...it,
          id: `item-${idx + 1}`,
          unit: "item",
          category: (it as any).category || "General",
          isUnbarcoded: false,
        }))
      );
      setCheckoutSession(null);
      setSplitError(null);
      setActiveInvoiceIndex(0);
    }
  };

  const cartTotal = cartItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

  // Bill-Splitting API execution
  const handleGenerateSplitBills = async () => {
    if (cartItems.length === 0) return;
    try {
      setGeneratingBills(true);
      setSplitError(null);
      setCheckoutSession(null);

      const res = await fetch("/api/payments/bill-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          config: {
            maxStandardBucketValue: maxBucketValue,
            highValueThreshold,
            boundaryRule,
            packingAlgorithm: "BEST_FIT_DECREASING",
          },
          cashierId: "CASHIER-01",
          terminalId: "POS-TERMINAL-01",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to split bills.");

      setCheckoutSession(data.session);
      setActiveInvoiceIndex(0);
    } catch (e: any) {
      setSplitError(e.message || "Failed to generate bills.");
    } finally {
      setGeneratingBills(false);
    }
  };

  // Simulate individual split invoice payment
  const handleSimulateInvoicePayment = async (invoice: any) => {
    if (!invoice.paymentId) return;
    try {
      setSimulatingPaymentId(invoice.paymentId);
      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: invoice.paymentId }),
      });

      if (res.ok) {
        setCheckoutSession((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            invoices: prev.invoices.map((inv: any) =>
              inv.paymentId === invoice.paymentId
                ? { ...inv, paymentStatus: "PAID" }
                : inv
            ),
          };
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingPaymentId(null);
    }
  };

  const handleSendInvoiceWhatsApp = async (invoice: any) => {
    const phone = invoiceCustomerPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      setWhatsAppError("Enter the customer's 10-digit WhatsApp number first.");
      return;
    }

    const customerName = invoiceCustomerName.trim() || "Valued Customer";
    try {
      setSendingInvoicePdf(true);
      setWhatsAppError(null);
      const response = await fetch("/api/receipts/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          storeName: checkoutSession?.storeName || "ShopMate Store",
          customerName,
          amount: invoice.totalAmount,
          items: invoice.items,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not create the invoice PDF.");
      }

      const pdf = await response.blob();
      const downloadUrl = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      // WhatsApp Web supports opening a specific conversation by phone number, but browsers
      // cannot programmatically upload a local file into a third-party chat for security reasons.
      window.open(`https://web.whatsapp.com/send?phone=${phone}`, "_blank", "noopener,noreferrer");
      setWhatsAppError("PDF downloaded. WhatsApp Web is open at this customer's chat - attach the downloaded PDF with the paperclip.");
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        setWhatsAppError(error?.message || "Could not share the invoice PDF.");
      }
    } finally {
      setSendingInvoicePdf(false);
    }
  };

  // Single Khata handlers
  const handleCustomerSelect = (cId: string) => {
    const c = customers.find((x) => x.id === cId);
    if (c) {
      setSelectedCustomer(c);
      setAmount(c.outstandingBalance.toString());
      setSingleUpiData(null);
      setSinglePaymentSuccess(null);
      setSingleQrError(null);
    }
  };

  const handleGenerateSingleQR = async () => {
    if (!selectedCustomer || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      setGeneratingSingleQR(true);
      setSinglePaymentSuccess(null);
      setSingleQrError(null);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: amt,
          note: "Khata Settlement",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate the UPI QR code.");
      setSingleUpiData(data);
    } catch (e: any) {
      setSingleQrError(e.message || "Unable to generate the UPI QR code.");
    } finally {
      setGeneratingSingleQR(false);
    }
  };

  const handleSimulateSingleSuccess = async () => {
    if (!singleUpiData?.paymentId) return;
    try {
      setSimulatingSingle(true);
      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: singleUpiData.paymentId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSinglePaymentSuccess(data);
        const custRes = await fetch(`/api/customers/${selectedCustomer.id}`);
        if (custRes.ok) {
          const cJson = await custRes.json();
          setSelectedCustomer(cJson.customer);
          setCustomers((prev) =>
            prev.map((c) => (c.id === cJson.customer.id ? cJson.customer : c))
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingSingle(false);
    }
  };

  const activeInvoice = checkoutSession?.invoices?.[activeInvoiceIndex];
  const paidInvoicesCount =
    checkoutSession?.invoices?.filter((inv: any) => inv.paymentStatus === "PAID").length || 0;
  const isSessionComplete =
    checkoutSession && paidInvoicesCount === checkoutSession.invoices.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            NPCI & Supermarket Compliant Orchestration
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            UPI Payment & QR Terminal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise multi-invoice deterministic bill-splitting & dynamic NPCI UPI QR code generation.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setTerminalMode("smart-checkout")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              terminalMode === "smart-checkout"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>SmartCheckout Enterprise (Split Bills)</span>
          </button>
          <button
            onClick={() => setTerminalMode("single-khata")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              terminalMode === "single-khata"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Khata Settlement QR</span>
          </button>
        </div>
      </div>

      {terminalMode === "smart-checkout" ? (
        /* ================= SMARTCHECKOUT ENTERPRISE BILL-SPLITTING MODE ================= */
        <div className="space-y-6">
          {/* Top Configuration & Policy Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Configurable Splitting Policy:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-semibold">Standard Bucket Max:</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={maxBucketValue}
                      onChange={(e) => setMaxBucketValue(Number(e.target.value) || 1999)}
                      className="w-24 pl-6 pr-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-semibold">High-Value Threshold:</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={highValueThreshold}
                      onChange={(e) => setHighValueThreshold(Number(e.target.value) || 2000)}
                      className="w-24 pl-6 pr-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-semibold">Rule C Boundary:</label>
                  <select
                    value={boundaryRule}
                    onChange={(e) => setBoundaryRule(e.target.value as any)}
                    className="px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-800 text-xs bg-white"
                  >
                    <option value="GREATER_THAN">&gt; ₹{highValueThreshold} Standalone</option>
                    <option value="GREATER_THAN_OR_EQUAL">&ge; ₹{highValueThreshold} Standalone</option>
                  </select>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                  Best Fit Decreasing
                </span>
              </div>
            </div>
          </div>

          {/* Shared customer contact for every invoice in this checkout */}
          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex items-start gap-2 mb-3">
              <Phone className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="text-xs font-black text-emerald-950">Customer details</h3>
                <p className="text-[11px] text-emerald-800">Used on every split invoice and its WhatsApp PDF receipt.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-emerald-900 mb-1">Customer name</label>
                <input
                  type="text"
                  value={invoiceCustomerName}
                  onChange={(e) => setInvoiceCustomerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-900 mb-1">WhatsApp number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={invoiceCustomerPhone}
                  onChange={(e) => setInvoiceCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Preset Scenarios Buttons */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Test Scenarios (Specification Cases 1–7):
            </span>
            <div className="flex flex-wrap gap-2">
              {SPEC_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  title={p.desc}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold transition-all shadow-2xs text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main 2-Column POS Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Cart & Item Scanner (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-slate-900">Scanned Cart</h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {/* Scanned Cart Items List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 truncate">{item.name}</span>
                          {item.isUnbarcoded ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black tracking-tight">
                              🏷️ No Barcode (Loose)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-mono">
                              |||| Barcoded
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                          <span>
                            {item.quantity} {item.unit || "item"} × {formatCurrency(item.unitPrice)}
                          </span>
                          {item.category && (
                            <span className="text-slate-500 font-medium">
                              • {item.category}
                            </span>
                          )}
                        </div>

                        {item.unitPrice > highValueThreshold && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-bold">
                            High-Value Standalone
                          </span>
                        )}
                      </div>

                      {/* Quantity Modifier & Line Total */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded-l transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1.5 font-bold text-slate-800 text-[11px]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded-r transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-black text-slate-900 min-w-[50px] text-right">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cartItems.length === 0 && (
                    <div className="text-center py-8 space-y-1 text-slate-400">
                      <ShoppingCart className="w-8 h-8 mx-auto stroke-1 opacity-50" />
                      <p className="text-xs">Cart is empty.</p>
                      <p className="text-[11px] text-slate-400">Scan a barcode or add unbarcoded loose products below.</p>
                    </div>
                  )}
                </div>

                {/* Click-to-expand item-entry tools */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedEntryPanel((current) => current === "manual_loose" ? null : "manual_loose")}
                      aria-expanded={expandedEntryPanel === "manual_loose"}
                      className={`w-full px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        expandedEntryPanel === "manual_loose"
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-200"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        Manual / Loose Item (No Barcode)
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedEntryPanel === "manual_loose" ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedEntryPanel((current) => current === "barcode" ? null : "barcode")}
                      aria-expanded={expandedEntryPanel === "barcode"}
                      className={`w-full px-3 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        expandedEntryPanel === "barcode"
                          ? "bg-blue-50 border-blue-300 text-blue-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-slate-700" />
                        Barcode Scanner
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedEntryPanel === "barcode" ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {expandedEntryPanel === "manual_loose" ? (
                    /* ======== MANUAL / LOOSE UNBARCODED ITEM FORM ======== */
                    <div className="space-y-3 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-xs font-bold text-amber-900">
                            Unbarcoded & Loose Product Entry
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          Grains, Produce, Bakery, Dairy
                        </span>
                      </div>

                      {/* Quick Chips for Common Unbarcoded Staples */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Quick Loose Staples:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {LOOSE_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectLoosePreset(p)}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100/60 border border-slate-200 hover:border-amber-300 text-slate-700 text-[11px] font-medium transition-all shadow-2xs flex items-center gap-1"
                            >
                              <span>{p.icon}</span>
                              <span>{p.name}</span>
                              <span className="font-bold text-slate-900">₹{p.unitPrice}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pick from Store Inventory Dropdown */}
                      {inventoryProducts.length > 0 && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Or Pick Existing Product from Store Catalog:
                          </label>
                          <select
                            onChange={(e) => handleSelectInventoryProduct(e.target.value)}
                            defaultValue=""
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                          >
                            <option value="" disabled>
                              -- Select from Inventory ({inventoryProducts.length} items) --
                            </option>
                            {inventoryProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.category}) — ₹{p.sellingPrice}/{p.unit || "kg"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Manual Form Fields */}
                      <div className="space-y-2 pt-1 border-t border-amber-200/50">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">
                            Product Name (No Barcode)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Loose Rice, Fresh Tomatoes, Bakery Bread"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                          />
                        </div>

                        {/* Category Dropdown & Add New Category */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold text-slate-700">
                              Category:
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewCategory(!isAddingNewCategory);
                                setNewCategoryInput("");
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                            >
                              {isAddingNewCategory ? "← Choose Existing" : "+ Add New Category"}
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
                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold text-slate-800"
                              />
                              <button
                                type="button"
                                onClick={handleSaveNewCategory}
                                disabled={!newCategoryInput.trim()}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold whitespace-nowrap"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <select
                              value={newItemCategory}
                              onChange={(e) => {
                                if (e.target.value === "__ADD_NEW__") {
                                  setIsAddingNewCategory(true);
                                  setNewCategoryInput("");
                                } else {
                                  setNewItemCategory(e.target.value);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                            >
                              {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  Category: {cat}
                                </option>
                              ))}
                              <option value="__ADD_NEW__" className="font-bold text-blue-600">
                                + Add New Category...
                              </option>
                            </select>
                          )}
                        </div>

                        {/* Price, Quantity & Unit */}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              Rate (₹)
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="₹ Rate"
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                            />
                          </div>

                          <div className="col-span-3">
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="1.5"
                              value={newItemQty}
                              onChange={(e) => setNewItemQty(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-center bg-white"
                            />
                          </div>

                          <div className="col-span-4">
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              Unit
                            </label>
                            <select
                              value={newItemUnit}
                              onChange={(e) => setNewItemUnit(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                            >
                              {SUPPORTED_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Live Total Preview */}
                        {newItemPrice && newItemQty && parseFloat(newItemPrice) > 0 && parseFloat(newItemQty) > 0 && (
                          <div className="text-[11px] font-semibold text-amber-900 bg-amber-100/60 p-2 rounded-xl border border-amber-200 flex items-center justify-between">
                            <span>Line Subtotal:</span>
                            <span className="font-black text-xs">
                              {newItemQty} {newItemUnit} × ₹{newItemPrice} ={" "}
                              {formatCurrency(parseFloat(newItemPrice) * parseFloat(newItemQty))}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleAddManualItem}
                          disabled={!newItemName.trim() || !newItemPrice || parseFloat(newItemPrice) <= 0}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Add Loose / Unbarcoded Product to Cart</span>
                        </button>
                      </div>
                    </div>
                  ) : expandedEntryPanel === "barcode" ? (
                    /* ======== BARCODE SCANNER MODE ======== */
                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800">
                            Barcode / SKU Scanner
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">USB / Bluetooth Scanner Ready</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Scan or type barcode / SKU..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleScanOrBarcodeAdd();
                            }
                          }}
                          autoFocus
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleScanOrBarcodeAdd}
                          disabled={!barcodeInput.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                        >
                          Scan / Add
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400">
                        Press Enter or scan with a physical handheld barcode scanner. For loose products, open the <strong>Manual / Loose Item</strong> section above.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Running Cart Total & Split Action */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Running Cart Total:
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>

                  <button
                    onClick={handleGenerateSplitBills}
                    disabled={generatingBills || cartItems.length === 0}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                  >
                    <Split className="w-4 h-4" />
                    <span>
                      {generatingBills
                        ? "Splitting Bills & Generating QRs..."
                        : "Generate Split Bills & QR Codes"}
                    </span>
                  </button>

                  {splitError && (
                    <p className="text-xs font-semibold text-rose-600 text-center" role="alert">
                      {splitError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Generated Bills, Dynamic UPI QR, Payment Workflow (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {!checkoutSession ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm min-h-[420px]">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <QrCode className="w-8 h-8 stroke-1" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">
                    Ready to Generate Split Invoices
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Scan or add products into the customer&apos;s cart, then click &ldquo;Generate Split
                    Bills & QR Codes&rdquo; to execute the deterministic Best-Fit Decreasing engine.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-in fade-in-50">
                  {/* Parent Checkout Header */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500 text-white">
                          Parent Checkout
                        </span>
                        <code className="text-xs font-mono font-bold text-blue-200">
                          {checkoutSession.checkoutSessionId}
                        </code>
                      </div>
                      <span className="text-lg font-black block mt-1">
                        Cart Total: {formatCurrency(checkoutSession.totalCartValue)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-300 block">
                        {paidInvoicesCount} of {checkoutSession.totalInvoicesCount} Invoices Paid
                      </span>
                      {isSessionComplete ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-black">
                          <CheckCircle2 className="w-3 h-3" /> Checkout Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Payment In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Generated Bills Selector Tabs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Generated Invoices ({checkoutSession.invoices.length}):
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Select an invoice to scan UPI QR
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {checkoutSession.invoices.map((inv: any, idx: number) => {
                        const isSelected = idx === activeInvoiceIndex;
                        const isPaid = inv.paymentStatus === "PAID";
                        return (
                          <button
                            key={inv.invoiceNumber}
                            onClick={() => setActiveInvoiceIndex(idx)}
                            className={`p-3 rounded-2xl border text-left transition-all relative ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-black text-slate-900">
                                {inv.invoiceNumber}
                              </span>
                              {isPaid ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> PAID
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                  PENDING
                                </span>
                              )}
                            </div>

                            <span className="text-base font-black text-slate-900 block mt-1">
                              {formatCurrency(inv.totalAmount)}
                            </span>

                            <div className="mt-1">
                              {inv.isHighValue ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                  High-Value Standalone
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-slate-500">
                                  {inv.itemCount} items (≤ ₹{maxBucketValue})
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Invoice Details & Live QR Code */}
                  {activeInvoice && (
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Left: Active Invoice Breakdown (7 cols) */}
                      <div className="md:col-span-7 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-blue-600" />
                            {activeInvoice.invoiceNumber}
                          </h4>
                          {activeInvoice.isHighValue ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-800 font-bold text-[10px]">
                              Rule A: Standalone Bill
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-bold text-[10px]">
                              Rule B: Standard Bucket (≤ ₹{maxBucketValue})
                            </span>
                          )}
                        </div>

                        {activeInvoice.standaloneReason && (
                          <p className="text-[11px] font-semibold text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-200">
                            {activeInvoice.standaloneReason}
                          </p>
                        )}

                        {/* Invoice Items Table */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-400 text-[10px] uppercase pb-1 border-b border-slate-200">
                            <span>Item</span>
                            <span>Qty × Rate</span>
                            <span>Total</span>
                          </div>
                          {activeInvoice.items.map((it: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-slate-700">
                              <span className="font-semibold">{it.name}</span>
                              <span className="text-slate-500 text-[11px]">
                                {it.quantity} × {formatCurrency(it.unitPrice)}
                              </span>
                              <span className="font-bold text-slate-900">
                                {formatCurrency(it.total)}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-slate-900 text-sm">
                            <span>Invoice Total:</span>
                            <span>{formatCurrency(activeInvoice.totalAmount)}</span>
                          </div>
                        </div>

                        {/* Invoice Payment Status */}
                        {activeInvoice.paymentStatus === "PAID" ? (
                          <div className="space-y-3">
                            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 font-bold text-xs">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              <span>Payment Verified & Succeeded for {activeInvoice.invoiceNumber}</span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                              <div className="flex items-center gap-2 text-emerald-900">
                                <Share2 className="w-4 h-4 text-emerald-600" />
                                <div>
                                  <p className="text-xs font-black">Send PDF Bill via WhatsApp</p>
                                  <p className="text-[10px] text-emerald-700 font-medium">Downloads the paid invoice PDF and opens WhatsApp Web directly at this customer&apos;s chat.</p>
                                </div>
                              </div>
                              {whatsAppError && <p className="text-[11px] font-semibold text-rose-600">{whatsAppError}</p>}
                              <button
                                type="button"
                                onClick={() => handleSendInvoiceWhatsApp(activeInvoice)}
                                disabled={sendingInvoicePdf}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                {sendingInvoicePdf ? "Creating PDF..." : "Open WhatsApp Web with PDF"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSimulateInvoicePayment(activeInvoice)}
                            disabled={simulatingPaymentId === activeInvoice.paymentId}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {simulatingPaymentId === activeInvoice.paymentId
                                ? "Verifying Payment..."
                                : `Simulate Payment for ${activeInvoice.invoiceNumber}`}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Right: Dynamic UPI QR Display (5 cols) */}
                      <div className="md:col-span-5 flex flex-col items-center text-center space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-md">
                          <img
                            src={activeInvoice.qrDataUrl}
                            alt={`QR for ${activeInvoice.invoiceNumber}`}
                            className="w-40 h-40 rounded"
                          />
                        </div>

                        <div className="text-center">
                          <span className="text-base font-black text-slate-900 block">
                            {formatCurrency(activeInvoice.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Scan with PhonePe / GPay / Paytm
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 block truncate max-w-[180px]">
                            {activeInvoice.invoiceNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= KHATA SETTLEMENT SINGLE QR MODE ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Card: Customer & Amount Selector */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900">Select Khata Customer</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Outstanding: {formatCurrency(c.outstandingBalance)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                    Current Khata Balance
                  </span>
                  <span className="text-2xl font-black text-purple-900">
                    {formatCurrency(selectedCustomer.outstandingBalance)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setSingleUpiData(null);
                    setSinglePaymentSuccess(null);
                  }}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleGenerateSingleQR}
                disabled={generatingSingleQR || !amount || parseFloat(amount) <= 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
              >
                <QrCode className="w-4 h-4" />
                <span>{generatingSingleQR ? "Generating QR..." : "Generate Dynamic UPI QR"}</span>
              </button>
              {singleQrError && (
                <p className="text-xs font-semibold text-rose-600" role="alert">
                  {singleQrError}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NPCI Standard Compliance</span>
              </div>
              <p>
                Generates genuine <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">upi://pay</code> payloads scanned by PhonePe, Google Pay, and Paytm.
              </p>
            </div>
          </div>

          {/* Right Card: Live Dynamic QR Display & Demo Simulator */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            {!singleUpiData ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <QrCode className="w-16 h-16 mx-auto stroke-1 text-slate-300" />
                <p className="text-xs">Click &ldquo;Generate Dynamic UPI QR&rdquo; to display payment code</p>
              </div>
            ) : singlePaymentSuccess ? (
              <div className="py-8 space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Payment Received!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {singlePaymentSuccess.speech_response ||
                      `Payment of ${formatCurrency(singleUpiData.amount)} received from ${selectedCustomer.name}.`}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                  {selectedCustomer.name}&apos;s outstanding balance is now:{" "}
                  <span className="text-sm font-black">
                    {formatCurrency(selectedCustomer.outstandingBalance)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Payment Pending
                </div>

                <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
                  <img
                    src={singleUpiData.qrDataUrl}
                    alt="UPI QR Code"
                    className="w-52 h-52 rounded-lg"
                  />
                </div>

                <div>
                  <div className="text-xl font-black text-slate-900">
                    {formatCurrency(singleUpiData.amount)}
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Scan with any UPI App (GPay, PhonePe, Paytm)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 block mt-1">
                    Pays to: {singleUpiData.recipientUpiId}
                  </span>
                </div>

                <div className="w-full pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSimulateSingleSuccess}
                    disabled={simulatingSingle}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{simulatingSingle ? "Verifying..." : "Simulate Successful Payment"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-400">
          Loading UPI Payment Terminal...
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
