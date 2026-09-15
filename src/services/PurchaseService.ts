import prisma from "@/lib/prisma";

export class PurchaseService {
  /**
   * Records a product purchase atomically
   */
  static async recordPurchase(params: {
    shopId: string;
    productName: string;
    quantity: number;
    unit?: string;
    totalAmount: number;
    source?: string;
  }) {
    const { shopId, productName, quantity, unit = "kg", totalAmount, source = "VOICE" } = params;

    if (quantity <= 0) throw new Error("Purchase quantity must be positive");
    if (totalAmount <= 0) throw new Error("Purchase amount must be positive");

    const purchasePricePerUnit = Math.round((totalAmount / quantity) * 100) / 100;

    return prisma.$transaction(async (tx) => {
      // Find or create product
      let product = await tx.product.findFirst({
        where: {
          shopId,
          name: { equals: productName },
        },
      });

      const previousStock = product ? product.currentStock : 0;
      const newStock = previousStock + quantity;

      if (!product) {
        product = await tx.product.create({
          data: {
            shopId,
            name: productName,
            unit,
            currentStock: newStock,
            purchasePrice: purchasePricePerUnit,
            sellingPrice: Math.round(purchasePricePerUnit * 1.2), // default 20% margin if brand new
            profitAmount: Math.round(purchasePricePerUnit * 0.2),
            minimumStock: 5,
          },
        });
      } else {
        const profitAmount = product.profitAmount > 0 ? product.profitAmount : Math.max(0, product.sellingPrice - purchasePricePerUnit);
        const newSellingPrice = product.profitAmount > 0 ? purchasePricePerUnit + product.profitAmount : product.sellingPrice;

        product = await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: newStock,
            purchasePrice: purchasePricePerUnit,
            sellingPrice: newSellingPrice,
            profitAmount,
          },
        });
      }

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          shopId,
          type: "PURCHASE",
          productId: product.id,
          quantity,
          unit: product.unit,
          amount: totalAmount,
          paymentMethod: "CASH",
          description: `Purchased ${quantity} ${product.unit} ${product.name} at ₹${purchasePricePerUnit}/${product.unit}`,
          source,
          status: "COMPLETED",
        },
      });

      // Create inventory movement
      const movement = await tx.inventoryMovement.create({
        data: {
          shopId,
          productId: product.id,
          type: "PURCHASE",
          quantity,
          previousStock,
          newStock,
          referenceTransactionId: transaction.id,
        },
      });

      return {
        product,
        transaction,
        movement,
        purchasePricePerUnit,
      };
    });
  }
}
