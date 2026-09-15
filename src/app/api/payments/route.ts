import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { PaymentService } from "@/services/PaymentService";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireShopSession();
    const payments = await prisma.payment.findMany({
      where: { shopId: session.shopId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: true,
        transaction: true,
      },
    });

    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { customerId, amount, note } = body;

    if (!customerId || !amount) {
      return NextResponse.json(
        { error: "customerId and amount are required" },
        { status: 400 }
      );
    }

    const upiData = await PaymentService.generateUPIQR({
      shopId: session.shopId,
      customerId,
      amount: parseFloat(amount.toString()),
      note,
    });

    return NextResponse.json({ success: true, ...upiData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
