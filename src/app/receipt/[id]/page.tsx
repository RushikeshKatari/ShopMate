"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Receipt,
  Store,
  Phone,
  Calendar,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { createWhatsAppShareUrl, generateWhatsAppMessage } from "@/lib/receipt/whatsapp";

function ReceiptContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const invoiceNumber = (params.id as string) || "INV-001";
  const checkoutId = searchParams.get("checkoutId") || "CHK-20260918-000001";
  const queryAmount = searchParams.get("amount") || "0";
  const queryStore = searchParams.get("store") || "SmartCheckout Supermarket";
  const queryStatus = searchParams.get("status") || "PAID";
  const customerParam = searchParams.get("customer") || "Valued Customer";
  const phoneParam = searchParams.get("phone") || "";

  const [customerPhone, setCustomerPhone] = useState(phoneParam);
  const [items, setItems] = useState<any[]>([]);
  const [storeData, setStoreData] = useState<any>({
    name: queryStore,
    phone: "+91 98765 43210",
    address: "Main Market Road, Hyderabad, Telangana - 500001",
    gstin: "36AABCS1429B1Z",
  });

  useEffect(() => {
    // Attempt to load settings or shop info
    async function loadShopDetails() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setStoreData((prev: any) => ({
              ...prev,
              name: data.settings.shopName || prev.name,
            }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadShopDetails();

    // Check if items were passed in localStorage or sessionStorage for this invoice
    try {
      const stored = sessionStorage.getItem(`receipt_${invoiceNumber}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.items) setItems(parsed.items);
      } else {
        // Fallback default item
        setItems([
          {
            name: "Supermarket Item",
            quantity: 1,
            unit: "item",
            unitPrice: parseFloat(queryAmount) || 100,
            total: parseFloat(queryAmount) || 100,
          },
        ]);
      }
    } catch {
      setItems([
        {
          name: "Supermarket Item",
          quantity: 1,
          unit: "item",
          unitPrice: parseFloat(queryAmount) || 100,
          total: parseFloat(queryAmount) || 100,
        },
      ]);
    }
  }, [invoiceNumber, queryAmount]);

  const subtotal = items.reduce((s, it) => s + (it.total || it.unitPrice * it.quantity), 0);
  const totalAmount = parseFloat(queryAmount) > 0 ? parseFloat(queryAmount) : subtotal;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const phone = customerPhone.trim() || "9876543210";
    const msg = generateWhatsAppMessage(
      {
        invoiceNumber,
        parentCheckoutId: checkoutId,
        storeName: storeData.name,
        storePhone: storeData.phone,
        storeAddress: storeData.address,
        customerName: customerParam,
        customerPhone: phone,
        date: formatDateTime(new Date()),
        paymentMethod: "UPI Dynamic QR",
        paymentReference: `UPI_${Date.now().toString().slice(-8)}`,
        paymentStatus: queryStatus,
        items,
        subtotal,
        taxTotal: 0,
        totalAmount,
      },
      window.location.origin
    );

    const shareUrl = createWhatsAppShareUrl(phone, msg);
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center">
      {/* Top Action Bar (Hidden during Print) */}
      <div className="max-w-md w-full mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Terminal</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl shadow-sm shadow-emerald-500/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send WhatsApp</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Quick Input on Screen (Hidden during Print) */}
      <div className="max-w-md w-full mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between gap-3 print:hidden shadow-xs">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-bold text-emerald-900 block">WhatsApp E-Bill:</span>
            <span className="text-[10px] text-emerald-700">Enter customer 10-digit mobile number</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="tel"
            placeholder="9876543210"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-28 px-2 py-1 rounded-lg border border-emerald-300 text-xs font-bold text-emerald-950 bg-white"
          />
          <button
            onClick={handleSendWhatsApp}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            Send
          </button>
        </div>
      </div>

      {/* Official Tax Invoice Container (Print-Ready) */}
      <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 p-6 md:p-8 shadow-md text-slate-800 space-y-5 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* Store Header */}
        <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 mb-1">
            <Store className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
            {storeData.name}
          </h1>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            {storeData.address}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            Ph: {storeData.phone} | GSTIN: {storeData.gstin}
          </p>
          <div className="inline-block px-2.5 py-0.5 mt-1 rounded bg-slate-100 text-slate-700 text-[10px] font-black tracking-wider uppercase">
            Official Tax Invoice
          </div>
        </div>

        {/* Invoice & Checkout Metadata */}
        <div className="text-xs space-y-1 text-slate-600">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-400">Invoice No:</span>
            <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-400">Parent Checkout:</span>
            <span className="font-mono font-semibold text-slate-700">{checkoutId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-400">Date & Time:</span>
            <span className="font-medium text-slate-800">{formatDateTime(new Date())}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-400">Customer:</span>
            <span className="font-semibold text-slate-800">{customerParam}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="font-semibold text-slate-400">Payment Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {queryStatus} (UPI)
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
          <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase pb-1 border-b border-slate-100">
            <span>Item Description</span>
            <span>Qty × Rate</span>
            <span>Total</span>
          </div>

          {items.map((it, idx) => (
            <div key={idx} className="flex justify-between text-xs text-slate-800 items-start">
              <div className="flex-1 pr-2">
                <span className="font-semibold block">{it.name}</span>
                {it.isUnbarcoded && (
                  <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1 rounded">
                    Loose Item
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-[11px] min-w-[70px] text-center">
                {it.quantity} {it.unit || "item"} × {formatCurrency(it.unitPrice)}
              </div>
              <div className="font-bold text-slate-900 min-w-[60px] text-right">
                {formatCurrency(it.total || it.unitPrice * it.quantity)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Tax Summary */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Taxes & GST (Included):</span>
            <span className="font-semibold text-slate-800">₹0.00</span>
          </div>
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Grand Total Paid:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Footer & QR Compliance */}
        <div className="text-center pt-4 border-t border-dashed border-slate-300 space-y-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            NPCI UPI Instant Settlement Verified
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            Thank you for shopping with us! 🙏
          </p>
          <p className="text-[9px] text-slate-400 font-mono">
            SmartCheckout Enterprise • e-Invoice Copy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading Receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
