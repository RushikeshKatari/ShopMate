import prisma from "@/lib/prisma";

export class InventoryService {
  /**
   * Adjusts product stock with an auditable inventory movement
   */
  static async adjustStock(params: {
    shopId: string;
    productId: string;
    quantityChange: number;
    type: "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN";
    referenceTransactionId?: string;
  }) {
    const { shopId, productId, quantityChange, type, referenceTransactionId } = params;

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, shopId },
      });

      if (!product) {
        throw new Error(`Product not found.`);
      }

      const previousStock = product.currentStock;
      const newStock = Math.max(0, previousStock + quantityChange);

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          shopId,
          productId,
          type,
          quantity: Math.abs(quantityChange),
          previousStock,
          newStock,
          referenceTransactionId,
        },
      });

      // Check low stock
      if (newStock <= updatedProduct.minimumStock) {
        await tx.notification.create({
          data: {
            shopId,
            type: "LOW_STOCK",
            title: `Low Stock: ${updatedProduct.name}`,
            message: `Current stock: ${newStock} ${updatedProduct.unit} (Minimum level: ${updatedProduct.minimumStock} ${updatedProduct.unit})`,
            severity: "WARNING",
          },
        });
      }

      return { product: updatedProduct, movement };
    });
  }

  /**
   * Sets minimum stock threshold
   */
  static async setMinimumStock(shopId: string, productId: string, minimumStock: number) {
    const product = await prisma.product.update({
      where: { id: productId },
      data: { minimumStock },
    });

    if (product.currentStock <= minimumStock) {
      await prisma.notification.create({
        data: {
          shopId,
          type: "LOW_STOCK",
          title: `Low Stock Alert: ${product.name}`,
          message: `Current stock is ${product.currentStock} ${product.unit}, which is at or below minimum level of ${minimumStock} ${product.unit}.`,
          severity: "WARNING",
        },
      });
    }

    return product;
  }
}
