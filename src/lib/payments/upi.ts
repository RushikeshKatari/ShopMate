/** Validation and URI construction for a merchant's UPI virtual payment address. */
export function normalizeUpiId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const upiId = value.trim().toLowerCase();
  if (!upiId) return null;

  if (!/^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/i.test(upiId)) {
    throw new Error("Enter a valid UPI ID, for example shopname@bank.");
  }
  return upiId;
}

export function createUpiPaymentUri(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  const { upiId, payeeName, amount, note } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const query = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${query.toString()}`;
}
