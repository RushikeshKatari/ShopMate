import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { BillSplittingService } from "@/services/BillSplittingService";

export async function POST(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { items, config, cashierId, terminalId, customerId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart must contain at least one item." },
        { status: 400 }
      );
    }

    const checkoutSession = await BillSplittingService.createCheckoutSession({
      shopId: session.shopId,
      items,
      config,
      cashierId,
      terminalId,
      customerId,
    });

    return NextResponse.json({
      success: true,
      session: checkoutSession,
    });
  } catch (error: any) {
    console.error("Bill split error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
