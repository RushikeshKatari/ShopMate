import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireShopSession();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = { shopId: session.shopId };

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod;
    }

    if (search.trim()) {
      where.OR = [
        { description: { contains: search.trim() } },
        { product: { name: { contains: search.trim() } } },
        { customer: { name: { contains: search.trim() } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: true,
        customer: true,
      },
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
