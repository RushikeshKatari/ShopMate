import prisma from "@/lib/prisma";

export class SalesService {
  /**
   * Records a normal cash/UPI sale with inventory check and error prevention
   */
  static async recordSale(params: {
    shopId: string;
    productName: string;
    quantity: number;
    unit?: string;
    totalAmount?: number;
    paymentMethod?: "CASH" | "UPI" | "OTHER";
    source?: string;
  }) {
    const { shopId, productName, quantity, paymentMethod = "CASH", source = "VOICE" } = params;

    if (quantity <= 0) throw new Error("Sale quantity must be greater than zero");

    return prisma.$transaction(async (tx) => {
      // Find product
      const product = await tx.product.findFirst({
        where: {
          shopId,
          name: { equals: productName },
        },
      });

      if (!product) {
        throw new Error(`Product "${productName}" was not found in inventory.`);
      }

      // Over-selling Error Prevention check
      if (product.currentStock < quantity) {
        // Suggest a likely speech-recognition error (e.g. 50 instead of 5, or 10 instead of 1)
        const likelyCandidate = quantity >= 10 ? quantity / 10 : undefined;
        const suggestion = likelyCandidate && likelyCandidate <= product.currentStock
          ? ` Did you mean to sell ${likelyCandidate} ${product.unit}?`
          : "";

        throw new Error(
          `Insufficient stock! Only ${product.currentStock} ${product.unit} of ${product.name} is currently recorded.${suggestion}`
        );
      }

      const totalAmount = params.totalAmount && params.totalAmount > 0
        ? params.totalAmount
        : Math.round(quantity * product.sellingPrice * 100) / 100;

      const previousStock = product.currentStock;
      const newStock = previousStock - quantity;

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          shopId,
          type: "SALE",
          productId: product.id,
          quantity,
          unit: product.unit,
          amount: totalAmount,
          paymentMethod,
          description: `Sold ${quantity} ${product.unit} ${product.name} for ₹${totalAmount}`,
          source,
          status: "COMPLETED",
        },
      });

      // Create inventory movement
      const movement = await tx.inventoryMovement.create({
        data: {
          shopId,
          productId: product.id,
          type: "SALE",
          quantity,
          previousStock,
          newStock,
          referenceTransactionId: transaction.id,
        },
      });

      // Low stock notification check
      if (newStock <= product.minimumStock) {
        await tx.notification.create({
          data: {
            shopId,
            type: "LOW_STOCK",
            title: `Low Stock Alert: ${product.name}`,
            message: `Current stock: ${newStock} ${product.unit} (Minimum required: ${product.minimumStock} ${product.unit})`,
            severity: "WARNING",
          },
        });
      }

      return {
        product: updatedProduct,
        transaction,
        movement,
        totalAmount,
      };
    });
  }
}
