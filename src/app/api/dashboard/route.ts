import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import { DashboardService } from "@/services/DashboardService";

export async function GET() {
  try {
    const session = await requireShopSession();
    const overview = await DashboardService.getOverview(session.shopId);
    return NextResponse.json({ success: true, shop: session, ...overview });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
