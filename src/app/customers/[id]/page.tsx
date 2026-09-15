"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  QrCode,
  CreditCard,
  History,
  Phone,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  const handleRecordPayment = async (e: React.FormEvent, bypass: boolean = false) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    setSubmittingPayment(true);
    setPaymentError("");

    try {
      const res = await fetch(`/api/customers/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          paymentMethod,
          bypassOverpaymentCheck: bypass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment recording failed");
      }

      setShowPaymentModal(false);
      setPaymentAmount("");
      fetchCustomer();
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !customer) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Customers</span>
      </Link>

      {/* Customer Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-800 font-black text-2xl flex items-center justify-center">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {customer.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.phone ? `+91 ${customer.phone}` : "No phone added"}</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Total Outstanding Khata
            </span>
            <span className="text-3xl font-black text-purple-700">
              {formatCurrency(customer.outstandingBalance)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => {
              setPaymentAmount(customer.outstandingBalance.toString());
              setShowPaymentModal(true);
            }}
            disabled={customer.outstandingBalance <= 0}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <Link
            href={`/payments?customerId=${customer.id}&amount=${customer.outstandingBalance}`}
            className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all border border-blue-200/80 flex items-center gap-2"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Generate UPI QR</span>
          </Link>
        </div>
      </div>

      {/* Transaction & Khata Ledger History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <span>Customer Khata Ledger</span>
          </h3>
          <span className="text-xs text-slate-400">Chronological history</span>
        </div>

        <div className="divide-y divide-slate-100">
          {(customer.transactions || []).length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No transactions recorded for this customer yet.
            </div>
          ) : (
            customer.transactions.map((t: any) => {
              const isCreditSale = t.type === "CREDIT_SALE";
              const isPayment = t.type === "PAYMENT";

              return (
                <div key={t.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isCreditSale
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isCreditSale ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-800">
                        {isCreditSale
                          ? `${t.product ? t.product.name : "Product"} (${t.quantity} ${t.unit || ""})`
                          : "Payment Received"}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(t.createdAt)} • via {t.paymentMethod}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-black ${
                        isCreditSale ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {isCreditSale ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {isCreditSale ? "Credit Added" : "Settlement"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Record Payment Modal with Overpayment Safety Guard */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Record Payment from {customer.name}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Payment Warning</span>
                </div>
                <p>{paymentError}</p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleRecordPayment(e, true)}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold"
                  >
                    Confirm & Proceed Anyway
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleRecordPayment(e, false)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 124"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 font-bold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Current balance owed: {formatCurrency(customer.outstandingBalance)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      paymentMethod === "CASH"
                        ? "bg-purple-50 border-purple-300 text-purple-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      paymentMethod === "UPI"
                        ? "bg-purple-50 border-purple-300 text-purple-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    UPI / Digital
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-500/20 disabled:opacity-60"
                >
                  {submittingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
