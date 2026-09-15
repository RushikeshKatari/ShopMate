import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    const product = await prisma.product.findFirst({
      where: { id: params.id, shopId: session.shopId },
      include: {
        inventoryMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const { name, category, unit, minimumStock, purchasePrice, sellingPrice, profitAmount } = body;

    const existing = await prisma.product.findFirst({
      where: { id: params.id, shopId: session.shopId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const calculatedProfit = profitAmount !== undefined ? profitAmount : (sellingPrice !== undefined && purchasePrice !== undefined ? sellingPrice - purchasePrice : existing.profitAmount);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(minimumStock !== undefined && { minimumStock: parseFloat(minimumStock.toString()) }),
        ...(purchasePrice !== undefined && { purchasePrice: parseFloat(purchasePrice.toString()) }),
        ...(sellingPrice !== undefined && { sellingPrice: parseFloat(sellingPrice.toString()) }),
        profitAmount: parseFloat(calculatedProfit.toString()),
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireShopSession();
    await prisma.product.deleteMany({
      where: { id: params.id, shopId: session.shopId },
    });
    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
