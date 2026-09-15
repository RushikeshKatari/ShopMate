import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { KhataService } from "@/services/KhataService";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { amount, paymentMethod = "CASH", bypassOverpaymentCheck = false } = body;

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, shopId: session.shopId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const result = await KhataService.recordPayment({
      shopId: session.shopId,
      customerName: customer.name,
      amount: parseFloat(amount.toString()),
      paymentMethod,
      source: "MANUAL",
      bypassOverpaymentCheck,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
