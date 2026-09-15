import prisma from "@/lib/prisma";

export class DashboardService {
  static async getOverview(shopId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Get today's sales transactions
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        shopId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Total Sales: sum of SALE and CREDIT_SALE
    let totalSales = 0;
    let creditSales = 0;
    let cashUpiSales = 0;

    for (const t of todayTransactions) {
      if (t.type === "SALE" || t.type === "CREDIT_SALE") {
        totalSales += t.amount;
        if (t.type === "CREDIT_SALE" || t.paymentMethod === "CREDIT") {
          creditSales += t.amount;
        } else {
          cashUpiSales += t.amount;
        }
      }
    }

    // 2. Products with Low Stock
    const allProducts = await prisma.product.findMany({
      where: { shopId },
      orderBy: { currentStock: "asc" },
    });

    const lowStockProducts = allProducts.filter((p) => p.currentStock <= p.minimumStock);
    const lowStockCount = lowStockProducts.length;

    // 3. Customers and Outstanding Khata
    const customers = await prisma.customer.findMany({
      where: { shopId },
      orderBy: { outstandingBalance: "desc" },
    });

    const totalOutstandingKhata = customers.reduce(
      (sum, c) => sum + (c.outstandingBalance || 0),
      0
    );

    // Top dashboard inventory items
    const topInventory = allProducts.slice(0, 6);

    // Top dashboard customers (with non-zero khata balance)
    const topKhataCustomers = customers.filter((c) => c.outstandingBalance > 0).slice(0, 6);

    // Recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      today: {
        totalSales,
        creditSales,
        cashUpiSales,
        lowStockCount,
        totalOutstandingKhata,
      },
      topInventory,
      topKhataCustomers,
      lowStockProducts,
      recentNotifications,
    };
  }
}
