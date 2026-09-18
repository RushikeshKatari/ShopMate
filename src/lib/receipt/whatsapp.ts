/**
 * WhatsApp Digital Invoice & Receipt Utility
 */

export interface ReceiptData {
  invoiceNumber: string;
  parentCheckoutId?: string;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  customerName?: string;
  customerPhone?: string;
  date: string;
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus: string;
  items: {
    name: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    total: number;
    isUnbarcoded?: boolean;
  }[];
  subtotal: number;
  taxTotal: number;
  discountTotal?: number;
  totalAmount: number;
}

export function generateWhatsAppMessage(receipt: ReceiptData, origin: string): string {
  const itemsText = receipt.items
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.name}* (${it.quantity} ${it.unit || "item"} × ₹${it.unitPrice}) = ₹${it.total.toLocaleString("en-IN")}${
          it.isUnbarcoded ? " _(Loose)_" : ""
        }`
    )
    .join("\n");

  const pdfUrl = `${origin}/receipt/${receipt.invoiceNumber}?checkoutId=${encodeURIComponent(
    receipt.parentCheckoutId || ""
  )}&amount=${receipt.totalAmount}&store=${encodeURIComponent(
    receipt.storeName
  )}&status=${encodeURIComponent(receipt.paymentStatus)}`;

  const message = `🧾 *TAX INVOICE / PAYMENT RECEIPT*
🏪 *${receipt.storeName.toUpperCase()}*
${receipt.storeAddress ? `📍 ${receipt.storeAddress}\n` : ""}${
    receipt.storePhone ? `📞 ${receipt.storePhone}\n` : ""
  }━━━━━━━━━━━━━━━━━━━━━━
📄 *Invoice No:* ${receipt.invoiceNumber}
${receipt.parentCheckoutId ? `🛒 *Checkout Ref:* ${receipt.parentCheckoutId}\n` : ""}📅 *Date:* ${receipt.date}
👤 *Customer:* ${receipt.customerName || "Valued Customer"}
💳 *Payment:* ${receipt.paymentMethod} (✅ ${receipt.paymentStatus})
${receipt.paymentReference ? `🔢 *Txn ID:* ${receipt.paymentReference}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━
🛍️ *PURCHASED ITEMS:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* ₹${receipt.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
📊 *Taxes (GST):* ₹${receipt.taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
${receipt.discountTotal ? `🏷️ *Discounts:* -₹${receipt.discountTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` : ""}💵 *TOTAL PAID:* ₹${receipt.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━━━━━━━
📥 *View & Download Official PDF Bill:*
${pdfUrl}

_Thank you for your purchase! Visit again!_ 🙏✨`;

  return message;
}

export function createWhatsAppShareUrl(phoneNumber: string, message: string): string {
  // Clean phone number: remove spaces, dashes, +, leading zero
  let cleanNumber = phoneNumber.replace(/[^0-9]/g, "");

  // If 10 digits (standard Indian mobile), prepend 91
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedMessage}`;
}
