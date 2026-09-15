import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireShopSession();
    const notifications = await prisma.notification.findMany({
      where: { shopId: session.shopId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
