import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { KhataService } from "./KhataService";

export class PaymentService {
  /**
   * Generates a UPI intent string and QR data URL for a customer payment
   */
  static async generateUPIQR(params: {
    shopId: string;
    customerId: string;
    amount: number;
    note?: string;
  }) {
    const { shopId, customerId, amount, note = "Khata Bill Settlement" } = params;

    const [shop, customer] = await Promise.all([
      prisma.shop.findUnique({ where: { id: shopId } }),
      prisma.customer.findUnique({ where: { id: customerId } }),
    ]);

    if (!shop || !customer) {
      throw new Error("Shop or customer not found");
    }

    // Standard NPCI UPI URI Scheme
    const pa = "shopmate.pay@upi"; // Demo VPA
    const pn = encodeURIComponent(shop.name);
    const tn = encodeURIComponent(`${note} - ${customer.name}`);
    const upiUri = `upi://pay?pa=${pa}&pn=${pn}&am=${amount.toFixed(2)}&cu=INR&tn=${tn}`;

    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1E3A8A",
        light: "#FFFFFF",
      },
    });

    // Create a PENDING payment record
    const payment = await prisma.payment.create({
      data: {
        shopId,
        customerId,
        amount,
        method: "UPI",
        status: "PENDING",
        provider: "SIMULATED_UPI",
        providerReference: `UPI_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    });

    return {
      paymentId: payment.id,
      upiUri,
      qrDataUrl,
      amount,
      customerName: customer.name,
      shopName: shop.name,
      status: "PENDING",
    };
  }

  /**
   * Simulates successful payment webhook or test completion
   */
  static async completeSimulatedPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { customer: true },
    });

    if (!payment) throw new Error("Payment record not found");
    if (payment.status === "SUCCESS") {
      return { success: true, message: "Payment already processed", payment };
    }

    // Atomically settle Khata through KhataService
    const result = await KhataService.recordPayment({
      shopId: payment.shopId,
      customerName: payment.customer!.name,
      amount: payment.amount,
      paymentMethod: "UPI",
      source: "SYSTEM",
      bypassOverpaymentCheck: true,
    });

    // Update payment record to SUCCESS
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "SUCCESS",
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      payment: updatedPayment,
      customer: result.customer,
      speech_response: `Payment received. ${result.customer.name}'s outstanding balance is now ₹${result.newBalance}.`,
    };
  }
}
