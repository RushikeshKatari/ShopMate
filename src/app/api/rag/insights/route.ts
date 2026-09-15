import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { shopRAG } from "@/lib/rag/ShopRAGEngine";

export async function GET() {
  try {
    const session = await requireShopSession();
    const insights = await shopRAG.getShopInsights(session.shopId);
    return NextResponse.json({ success: true, data: insights });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
