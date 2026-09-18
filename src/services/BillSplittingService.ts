import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { createUpiPaymentUri } from "@/lib/payments/upi";

export interface CartItem {
  id?: string;
  sku?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  category?: string;
  unit?: string;
  isUnbarcoded?: boolean;
  taxPercent?: number; // e.g., 5, 12, 18
  discountAmount?: number;
}

export interface BillSplittingConfig {
  maxStandardBucketValue?: number; // Default: 1999
  highValueThreshold?: number; // Default: 2000
  boundaryRule?: "GREATER_THAN" | "GREATER_THAN_OR_EQUAL"; // Default: GREATER_THAN (> 2000 is standalone)
  packingAlgorithm?: "BEST_FIT_DECREASING" | "FIRST_FIT_DECREASING";
}

export interface SplitBillItem {
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  isUnbarcoded?: boolean;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  subtotal: number;
  total: number;
}

export interface GeneratedInvoice {
  invoiceNumber: string;
  parentCheckoutId: string;
  isHighValue: boolean;
  standaloneReason?: string;
  items: SplitBillItem[];
  itemCount: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  paymentStatus: "PENDING" | "QR_GENERATED" | "PAID" | "FAILED" | "CANCELLED";
  upiUri: string;
  qrDataUrl: string;
  paymentId?: string;
}

export interface CheckoutSessionResult {
  checkoutSessionId: string;
  storeName: string;
  cashierId: string;
  terminalId: string;
  totalCartValue: number;
  totalInvoicesCount: number;
  standardInvoicesCount: number;
  highValueInvoicesCount: number;
  configSnapshot: {
    maxStandardBucketValue: number;
    highValueThreshold: number;
    boundaryRule: string;
    packingAlgorithm: string;
  };
  invoices: GeneratedInvoice[];
  createdAt: string;
}

export class BillSplittingService {
  /**
   * Deterministically splits a cart into compliant invoices based on configurable business rules.
   */
  static splitCart(
    items: CartItem[],
    config: BillSplittingConfig = {}
  ): {
    standardBills: { items: SplitBillItem[]; total: number }[];
    highValueBills: { items: SplitBillItem[]; total: number; reason: string }[];
    configSnapshot: Required<BillSplittingConfig>;
  } {
    const maxStandardBucketValue = config.maxStandardBucketValue ?? 1999;
    const highValueThreshold = config.highValueThreshold ?? 2000;
    const boundaryRule = config.boundaryRule ?? "GREATER_THAN";
    const packingAlgorithm = config.packingAlgorithm ?? "BEST_FIT_DECREASING";

    const isHighValueItem = (unitPrice: number): boolean => {
      if (boundaryRule === "GREATER_THAN_OR_EQUAL") {
        return unitPrice >= highValueThreshold;
      }
      return unitPrice > highValueThreshold;
    };

    const standardItems: SplitBillItem[] = [];
    const highValueBills: { items: SplitBillItem[]; total: number; reason: string }[] = [];

    for (const item of items) {
      const taxPercent = item.taxPercent ?? 0;
      const discountAmount = item.discountAmount ?? 0;
      const unitPrice = item.unitPrice;
      const qty = item.quantity;

      if (isHighValueItem(unitPrice)) {
        // Rule A & Case 7: High-value items become their own separate bills.
        // If qty > 1, each high-value unit becomes its own separate standalone bill.
        for (let i = 0; i < qty; i++) {
          const subtotal = unitPrice;
          const lineDiscount = discountAmount / qty;
          const taxable = Math.max(0, subtotal - lineDiscount);
          const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(2));
          const total = Number((taxable + taxAmount).toFixed(2));

          highValueBills.push({
            reason: `Unit price ₹${unitPrice.toLocaleString("en-IN")} exceeds threshold ₹${highValueThreshold.toLocaleString("en-IN")}`,
            total,
            items: [
              {
                sku: item.sku || (item.isUnbarcoded ? `LOOSE-${item.name.toUpperCase().replace(/\s+/g, "_")}` : `SKU-${item.name.toUpperCase().replace(/\s+/g, "_")}`),
                name: item.name,
                quantity: 1,
                unitPrice,
                unit: item.unit || "item",
                isUnbarcoded: !!item.isUnbarcoded,
                taxPercent,
                taxAmount,
                discountAmount: lineDiscount,
                subtotal,
                total,
              },
            ],
          });
        }
      } else {
        // Item is at or below threshold.
        // Unpack quantities if total line would exceed bucket, or pack intact if line <= bucket.
        const lineTotal = Number((unitPrice * qty).toFixed(2));
        if (lineTotal <= maxStandardBucketValue) {
          const subtotal = unitPrice * qty;
          const taxable = Math.max(0, subtotal - discountAmount);
          const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(2));
          const total = Number((taxable + taxAmount).toFixed(2));

          standardItems.push({
            sku: item.sku || (item.isUnbarcoded ? `LOOSE-${item.name.toUpperCase().replace(/\s+/g, "_")}` : `SKU-${item.name.toUpperCase().replace(/\s+/g, "_")}`),
            name: item.name,
            quantity: qty,
            unitPrice,
            unit: item.unit || "item",
            isUnbarcoded: !!item.isUnbarcoded,
            taxPercent,
            taxAmount,
            discountAmount,
            subtotal,
            total,
          });
        } else {
          for (let i = 0; i < qty; i++) {
            const subtotal = unitPrice;
            const unitDiscount = discountAmount / qty;
            const taxable = Math.max(0, subtotal - unitDiscount);
            const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(2));
            const total = Number((taxable + taxAmount).toFixed(2));

            standardItems.push({
              sku: item.sku || (item.isUnbarcoded ? `LOOSE-${item.name.toUpperCase().replace(/\s+/g, "_")}` : `SKU-${item.name.toUpperCase().replace(/\s+/g, "_")}`),
              name: item.name,
              quantity: 1,
              unitPrice,
              unit: item.unit || "item",
              isUnbarcoded: !!item.isUnbarcoded,
              taxPercent,
              taxAmount,
              discountAmount: unitDiscount,
              subtotal,
              total,
            });
          }
        }
      }
    }

    // Deterministic Packing: Best Fit Decreasing (BFD)
    // Sort standard items in descending order of item total
    standardItems.sort((a, b) => b.total - a.total);

    const buckets: { items: SplitBillItem[]; total: number }[] = [];

    for (const item of standardItems) {
      let bestBucketIndex = -1;
      let minRemainingCapacity = Infinity;

      for (let i = 0; i < buckets.length; i++) {
        const remainingCapacity = maxStandardBucketValue - buckets[i].total;
        if (item.total <= remainingCapacity && remainingCapacity - item.total < minRemainingCapacity) {
          minRemainingCapacity = remainingCapacity - item.total;
          bestBucketIndex = i;
        }
      }

      if (bestBucketIndex !== -1) {
        buckets[bestBucketIndex].items.push(item);
        buckets[bestBucketIndex].total = Number((buckets[bestBucketIndex].total + item.total).toFixed(2));
      } else {
        // Create new standard bucket
        buckets.push({
          items: [item],
          total: Number(item.total.toFixed(2)),
        });
      }
    }

    return {
      standardBills: buckets,
      highValueBills,
      configSnapshot: {
        maxStandardBucketValue,
        highValueThreshold,
        boundaryRule,
        packingAlgorithm,
      },
    };
  }

  /**
   * Generates a full Parent Checkout Session with split bills and individual dynamic UPI QR codes.
   */
  static async createCheckoutSession(params: {
    shopId: string;
    items: CartItem[];
    config?: BillSplittingConfig;
    cashierId?: string;
    terminalId?: string;
    customerId?: string;
  }): Promise<CheckoutSessionResult> {
    const { shopId, items, config = {}, cashierId = "CASHIER-01", terminalId = "TERM-POS-01", customerId } = params;

    const [shop, settings] = await Promise.all([
      prisma.shop.findUnique({ where: { id: shopId } }),
      prisma.setting.findUnique({ where: { shopId } }),
    ]);

    if (!shop) throw new Error("Shop not found");
    const payeeUpi = settings?.upiId || "shopmate.store@upi";
    const shopName = shop.name || "SmartCheckout Enterprise";

    const splitResult = this.splitCart(items, config);

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const checkoutSessionId = `CHK-${today}-${randomSuffix}`;

    const invoices: GeneratedInvoice[] = [];
    let invoiceSequence = 1;

    const nextInvoiceNumber = () => {
      const numStr = String(invoiceSequence++).padStart(3, "0");
      return `INV-${numStr}`;
    };

    // 1. Process high-value standalone bills
    for (const hv of splitResult.highValueBills) {
      const invNum = nextInvoiceNumber();
      const upiUri = createUpiPaymentUri({
        upiId: payeeUpi,
        payeeName: shopName,
        amount: hv.total,
        note: `${invNum} (${checkoutSessionId})`,
      });

      const qrDataUrl = await QRCode.toDataURL(upiUri, {
        width: 280,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });

      const payment = await prisma.payment.create({
        data: {
          shopId,
          customerId: customerId || null,
          amount: hv.total,
          method: "UPI",
          status: "PENDING",
          provider: "SIMULATED_UPI",
          providerReference: `${checkoutSessionId}_${invNum}`,
        },
      });

      const subtotal = hv.items.reduce((s, it) => s + it.subtotal, 0);
      const taxTotal = hv.items.reduce((s, it) => s + it.taxAmount, 0);
      const discountTotal = hv.items.reduce((s, it) => s + it.discountAmount, 0);

      invoices.push({
        invoiceNumber: invNum,
        parentCheckoutId: checkoutSessionId,
        isHighValue: true,
        standaloneReason: hv.reason,
        items: hv.items,
        itemCount: hv.items.length,
        subtotal: Number(subtotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        totalAmount: hv.total,
        paymentStatus: "PENDING",
        upiUri,
        qrDataUrl,
        paymentId: payment.id,
      });
    }

    // 2. Process standard bills
    for (const std of splitResult.standardBills) {
      const invNum = nextInvoiceNumber();
      const upiUri = createUpiPaymentUri({
        upiId: payeeUpi,
        payeeName: shopName,
        amount: std.total,
        note: `${invNum} (${checkoutSessionId})`,
      });

      const qrDataUrl = await QRCode.toDataURL(upiUri, {
        width: 280,
        margin: 2,
        color: { dark: "#1E3A8A", light: "#FFFFFF" },
      });

      const payment = await prisma.payment.create({
        data: {
          shopId,
          customerId: customerId || null,
          amount: std.total,
          method: "UPI",
          status: "PENDING",
          provider: "SIMULATED_UPI",
          providerReference: `${checkoutSessionId}_${invNum}`,
        },
      });

      const subtotal = std.items.reduce((s, it) => s + it.subtotal, 0);
      const taxTotal = std.items.reduce((s, it) => s + it.taxAmount, 0);
      const discountTotal = std.items.reduce((s, it) => s + it.discountAmount, 0);

      invoices.push({
        invoiceNumber: invNum,
        parentCheckoutId: checkoutSessionId,
        isHighValue: false,
        items: std.items,
        itemCount: std.items.length,
        subtotal: Number(subtotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        totalAmount: std.total,
        paymentStatus: "PENDING",
        upiUri,
        qrDataUrl,
        paymentId: payment.id,
      });
    }

    const totalCartValue = Number(
      invoices.reduce((acc, inv) => acc + inv.totalAmount, 0).toFixed(2)
    );

    return {
      checkoutSessionId,
      storeName: shopName,
      cashierId,
      terminalId,
      totalCartValue,
      totalInvoicesCount: invoices.length,
      standardInvoicesCount: splitResult.standardBills.length,
      highValueInvoicesCount: splitResult.highValueBills.length,
      configSnapshot: splitResult.configSnapshot,
      invoices,
      createdAt: new Date().toISOString(),
    };
  }
}
