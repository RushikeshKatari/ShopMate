import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { PaymentService } from "@/services/PaymentService";

export async function POST(req: Request) {
  try {
    await requireShopSession();
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const result = await PaymentService.completeSimulatedPayment(paymentId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
