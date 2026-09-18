import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { KhataService } from "./KhataService";
import { createUpiPaymentUri } from "@/lib/payments/upi";

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

    const [shop, customer, settings] = await Promise.all([
      prisma.shop.findUnique({ where: { id: shopId } }),
      prisma.customer.findFirst({ where: { id: customerId, shopId } }),
      prisma.setting.findUnique({ where: { shopId } }),
    ]);

    if (!shop || !customer) {
      throw new Error("Shop or customer not found");
    }
    if (!settings?.upiId) {
      throw new Error("Add your UPI ID in Settings before generating a payment QR code.");
    }

    // The QR recipient is always the UPI ID saved by this shop owner.
    const upiUri = createUpiPaymentUri({
      upiId: settings.upiId,
      payeeName: shop.name,
      amount,
      note: `${note} - ${customer.name}`,
    });

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
      recipientUpiId: settings.upiId,
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

    // If customer is attached, atomically settle Khata through KhataService
    let khataResult: any = null;
    if (payment.customer) {
      khataResult = await KhataService.recordPayment({
        shopId: payment.shopId,
        customerName: payment.customer.name,
        amount: payment.amount,
        paymentMethod: "UPI",
        source: "SYSTEM",
        bypassOverpaymentCheck: true,
      });
    }

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
      customer: khataResult?.customer,
      speech_response: khataResult?.customer
        ? `Payment received. ${khataResult.customer.name}'s outstanding balance is now ₹${khataResult.newBalance}.`
        : `Payment of ₹${payment.amount.toLocaleString("en-IN")} successfully received and verified.`,
    };
  }
}
