import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { InventoryService } from "@/services/InventoryService";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { quantityChange, type = "ADJUSTMENT" } = body;

    if (quantityChange === undefined || isNaN(quantityChange)) {
      return NextResponse.json(
        { error: "Valid quantityChange number is required" },
        { status: 400 }
      );
    }

    const result = await InventoryService.adjustStock({
      shopId: session.shopId,
      productId: params.id,
      quantityChange: parseFloat(quantityChange.toString()),
      type,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
