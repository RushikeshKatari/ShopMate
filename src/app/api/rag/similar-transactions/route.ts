import { NextRequest, NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { shopRAG } from "@/lib/rag/ShopRAGEngine";

export async function GET(req: NextRequest) {
  try {
    const session = await requireShopSession();
    const query = req.nextUrl.searchParams.get("q") ?? "";
    const topK = parseInt(req.nextUrl.searchParams.get("k") ?? "5", 10);
    if (!query) return NextResponse.json({ success: false, error: "q param required" }, { status: 400 });
    const results = await shopRAG.similarTransactions(session.shopId, query, topK);
    return NextResponse.json({ success: true, data: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
