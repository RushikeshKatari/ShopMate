"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function PaymentsContent() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";
  const initialAmount = searchParams.get("amount") || "";

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(true);

  // UPI QR state
  const [upiData, setUpiData] = useState<any>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        const res = await fetch("/api/customers");
        if (res.ok) {
          const data = await res.json();
          const list = data.customers || [];
          setCustomers(list);

          if (initialCustomerId) {
            const match = list.find((c: any) => c.id === initialCustomerId);
            if (match) setSelectedCustomer(match);
          } else if (list.length > 0) {
            // Pick first customer with outstanding balance
            const withBalance = list.find((c: any) => c.outstandingBalance > 0) || list[0];
            setSelectedCustomer(withBalance);
            setAmount(withBalance.outstandingBalance.toString());
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, [initialCustomerId]);

  const handleCustomerSelect = (cId: string) => {
    const c = customers.find((x) => x.id === cId);
    if (c) {
      setSelectedCustomer(c);
      setAmount(c.outstandingBalance.toString());
      setUpiData(null);
      setPaymentSuccess(null);
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedCustomer || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      setGeneratingQR(true);
      setPaymentSuccess(null);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: amt,
          note: "Khata Settlement",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUpiData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!upiData?.paymentId) return;

    try {
      setSimulating(true);
      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: upiData.paymentId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentSuccess(data);
        // Refresh customer data
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
      setSimulating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          UPI Payment & QR Terminal
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate NPCI-compliant dynamic UPI QR codes and simulate instant payment settlements
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Customer & Amount Selector */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900">Select Khata Customer</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name
              </label>
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
                  setUpiData(null);
                  setPaymentSuccess(null);
                }}
                placeholder="Enter amount"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleGenerateQR}
              disabled={generatingQR || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
            >
              <QrCode className="w-4 h-4" />
              <span>{generatingQR ? "Generating QR..." : "Generate Dynamic UPI QR"}</span>
            </button>
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
          {!upiData ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <QrCode className="w-16 h-16 mx-auto stroke-1 text-slate-300" />
              <p className="text-xs">Click &ldquo;Generate Dynamic UPI QR&rdquo; to display payment code</p>
            </div>
          ) : paymentSuccess ? (
            <div className="py-8 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">Payment Received!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {paymentSuccess.speech_response ||
                    `Payment of ${formatCurrency(upiData.amount)} received from ${selectedCustomer.name}.`}
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

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
                <img
                  src={upiData.qrDataUrl}
                  alt="UPI QR Code"
                  className="w-52 h-52 rounded-lg"
                />
              </div>

              <div>
                <div className="text-xl font-black text-slate-900">
                  {formatCurrency(upiData.amount)}
                </div>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Scan with any UPI App (GPay, PhonePe, Paytm)
                </span>
              </div>

              {/* Instant Hackathon Simulator Button */}
              <div className="w-full pt-2 border-t border-slate-100">
                <div className="mb-2 text-[11px] text-slate-400">
                  For Hackathon Verification:
                </div>
                <button
                  onClick={handleSimulateSuccess}
                  disabled={simulating}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {simulating ? "Verifying..." : "Simulate Successful Payment"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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

