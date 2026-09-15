import prisma from "@/lib/prisma";

export class PricingService {
  /**
   * Sets selling price directly for a product
   */
  static async setSellingPrice(shopId: string, productId: string, sellingPrice: number) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, shopId },
      });

      if (!product) throw new Error("Product not found");

      const profitAmount = Math.max(0, sellingPrice - product.purchasePrice);

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          sellingPrice,
          profitAmount,
        },
      });

      await tx.transaction.create({
        data: {
          shopId,
          type: "PRICE_CHANGE",
          productId,
          amount: sellingPrice,
          description: `Selling price changed to ₹${sellingPrice}/${product.unit} (Profit: ₹${profitAmount}/${product.unit})`,
          source: "VOICE",
          status: "COMPLETED",
        },
      });

      return updated;
    });
  }

  /**
   * Sets profit margin on a product, automatically computing selling price = purchase price + profit
   */
  static async setProfitMargin(shopId: string, productId: string, profitAmount: number) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, shopId },
      });

      if (!product) throw new Error("Product not found");

      const sellingPrice = product.purchasePrice + profitAmount;

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          profitAmount,
          sellingPrice,
        },
      });

      await tx.transaction.create({
        data: {
          shopId,
          type: "PRICE_CHANGE",
          productId,
          amount: sellingPrice,
          description: `Profit set to ₹${profitAmount}/${product.unit}. Selling price is now ₹${sellingPrice}/${product.unit}.`,
          source: "VOICE",
          status: "COMPLETED",
        },
      });

      return updated;
    });
  }
}
