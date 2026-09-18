import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeUpiId } from "@/lib/payments/upi";

export async function GET() {
  try {
    const session = await requireShopSession();
    let settings = await prisma.setting.findUnique({
      where: { shopId: session.shopId },
    });

    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          shopId: session.shopId,
          shopName: session.shopName,
          language: "en-IN",
          currency: "INR",
        },
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: session.shopId },
    });

    return NextResponse.json({ success: true, settings, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const {
      shopName,
      language,
      voiceEnabled,
      voiceResponseEnabled,
      lowStockNotifications,
      offlineMode,
      phone,
      address,
      upiId,
    } = body;
    const normalizedUpiId = upiId === undefined ? undefined : normalizeUpiId(upiId);

    const [updatedSettings, updatedShop] = await prisma.$transaction([
      prisma.setting.upsert({
        where: { shopId: session.shopId },
        update: {
          ...(shopName && { shopName }),
          ...(language && { language }),
          ...(voiceEnabled !== undefined && { voiceEnabled }),
          ...(voiceResponseEnabled !== undefined && { voiceResponseEnabled }),
          ...(lowStockNotifications !== undefined && { lowStockNotifications }),
          ...(offlineMode !== undefined && { offlineMode }),
          ...(normalizedUpiId !== undefined && { upiId: normalizedUpiId }),
        },
        create: {
          shopId: session.shopId,
          shopName: shopName || session.shopName,
          language: language || "en-IN",
          ...(normalizedUpiId !== undefined && { upiId: normalizedUpiId }),
        },
      }),
      prisma.shop.update({
        where: { id: session.shopId },
        data: {
          ...(shopName && { name: shopName }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
        },
      }),
    ]);

    return NextResponse.json({ success: true, settings: updatedSettings, shop: updatedShop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
