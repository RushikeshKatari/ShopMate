import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { SalesService } from "@/services/SalesService";
import { PurchaseService } from "@/services/PurchaseService";
import { KhataService } from "@/services/KhataService";

export async function POST(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { queue } = body; // Array of pending offline actions

    if (!Array.isArray(queue) || queue.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const results = [];

    for (const item of queue) {
      const { id, type, payload } = item;
      try {
        let actionResult = null;
        if (type === "SALE") {
          actionResult = await SalesService.recordSale({
            shopId: session.shopId,
            ...payload,
            source: "OFFLINE_SYNC",
          });
        } else if (type === "PURCHASE") {
          actionResult = await PurchaseService.recordPurchase({
            shopId: session.shopId,
            ...payload,
            source: "OFFLINE_SYNC",
          });
        } else if (type === "CREDIT_SALE") {
          actionResult = await KhataService.recordCreditSale({
            shopId: session.shopId,
            ...payload,
            source: "OFFLINE_SYNC",
          });
        } else if (type === "PAYMENT") {
          actionResult = await KhataService.recordPayment({
            shopId: session.shopId,
            ...payload,
            source: "OFFLINE_SYNC",
          });
        }
        results.push({ id, status: "SUCCESS", data: actionResult });
      } catch (err: any) {
        results.push({ id, status: "ERROR", error: err.message });
      }
    }

    return NextResponse.json({ success: true, results, processed: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
