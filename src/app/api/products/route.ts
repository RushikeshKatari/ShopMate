import { NextResponse } from "next/server";
import { requireShopSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await requireShopSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const where: any = { shopId: session.shopId };

    if (search.trim()) {
      where.name = { contains: search.trim() };
    }

    if (category.trim() && category !== "All") {
      where.category = category.trim();
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireShopSession();
    const body = await req.json();
    const {
      name,
      category = "General",
      unit = "kg",
      currentStock = 0,
      minimumStock = 5,
      purchasePrice = 0,
      sellingPrice = 0,
      profitAmount = 0,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const calculatedProfit = profitAmount > 0 ? profitAmount : Math.max(0, sellingPrice - purchasePrice);
    const finalSellingPrice = sellingPrice > 0 ? sellingPrice : purchasePrice + calculatedProfit;

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          shopId: session.shopId,
          name,
          category,
          unit,
          currentStock: parseFloat(currentStock.toString()),
          minimumStock: parseFloat(minimumStock.toString()),
          purchasePrice: parseFloat(purchasePrice.toString()),
          sellingPrice: parseFloat(finalSellingPrice.toString()),
          profitAmount: parseFloat(calculatedProfit.toString()),
        },
      });

      if (currentStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            shopId: session.shopId,
            productId: newProduct.id,
            type: "ADJUSTMENT",
            quantity: parseFloat(currentStock.toString()),
            previousStock: 0,
            newStock: parseFloat(currentStock.toString()),
          },
        });
      }

      return newProduct;
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
