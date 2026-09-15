import prisma from "@/lib/prisma";

export class KhataService {
  /**
   * Records a credit sale to a customer's khata
   */
  static async recordCreditSale(params: {
    shopId: string;
    customerName: string;
    productName: string;
    quantity: number;
    unit?: string;
    totalAmount?: number;
    source?: string;
  }) {
    const { shopId, customerName, productName, quantity, source = "VOICE" } = params;

    if (quantity <= 0) throw new Error("Credit sale quantity must be positive");

    return prisma.$transaction(async (tx) => {
      // 1. Find or create customer
      let customer = await tx.customer.findFirst({
        where: {
          shopId,
          name: { equals: customerName },
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            shopId,
            name: customerName,
            outstandingBalance: 0,
          },
        });
      }

      // 2. Find product
      const product = await tx.product.findFirst({
        where: {
          shopId,
          name: { equals: productName },
        },
      });

      if (!product) {
        throw new Error(`Product "${productName}" was not found in inventory.`);
      }

      // 3. Check stock sanity
      if (product.currentStock < quantity) {
        throw new Error(
          `Insufficient stock! Only ${product.currentStock} ${product.unit} of ${product.name} is available for khata sale.`
        );
      }

      // 4. Calculate amount
      const amount = params.totalAmount && params.totalAmount > 0
        ? params.totalAmount
        : Math.round(quantity * product.sellingPrice * 100) / 100;

      // 5. Update customer balance (+amount)
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          outstandingBalance: customer.outstandingBalance + amount,
        },
      });

      // 6. Update product stock (-quantity)
      const previousStock = product.currentStock;
      const newStock = previousStock - quantity;

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      // 7. Create credit sale transaction
      const transaction = await tx.transaction.create({
        data: {
          shopId,
          type: "CREDIT_SALE",
          productId: product.id,
          customerId: customer.id,
          quantity,
          unit: product.unit,
          amount,
          paymentMethod: "CREDIT",
          description: `${quantity} ${product.unit} ${product.name} added to khata for ${customer.name}`,
          source,
          status: "COMPLETED",
        },
      });

      // 8. Create inventory movement
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

      // 9. Low stock alert if applicable
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
        customer: updatedCustomer,
        product: updatedProduct,
        transaction,
        movement,
        amount,
      };
    });
  }

  /**
   * Records a khata payment from a customer
   */
  static async recordPayment(params: {
    shopId: string;
    customerName: string;
    amount: number;
    paymentMethod?: "CASH" | "UPI" | "OTHER";
    source?: string;
    bypassOverpaymentCheck?: boolean;
  }) {
    const { shopId, customerName, amount, paymentMethod = "CASH", source = "VOICE", bypassOverpaymentCheck = false } = params;

    if (amount <= 0) throw new Error("Payment amount must be greater than zero");

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          shopId,
          name: { equals: customerName },
        },
      });

      if (!customer) {
        throw new Error(`Customer "${customerName}" was not found.`);
      }

      // Overpayment prevention check
      if (amount > customer.outstandingBalance && !bypassOverpaymentCheck) {
        throw new Error(
          `${customer.name} currently owes ₹${customer.outstandingBalance}. Did you mean to record ₹${customer.outstandingBalance} or ₹${amount} as a payment?`
        );
      }

      const newBalance = Math.max(0, customer.outstandingBalance - amount);

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          outstandingBalance: newBalance,
        },
      });

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          shopId,
          type: "PAYMENT",
          customerId: customer.id,
          amount,
          paymentMethod,
          description: `Payment of ₹${amount} received from ${customer.name} via ${paymentMethod}`,
          source,
          status: "COMPLETED",
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          shopId,
          customerId: customer.id,
          transactionId: transaction.id,
          amount,
          method: paymentMethod,
          status: "SUCCESS",
          provider: paymentMethod === "UPI" ? "UPI_QR" : "CASH",
        },
      });

      return {
        customer: updatedCustomer,
        transaction,
        payment,
        previousBalance: customer.outstandingBalance,
        newBalance,
      };
    });
  }
}
