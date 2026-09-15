import prisma from "@/lib/prisma";

export class CustomerService {
  static async getCustomers(shopId: string, search?: string) {
    const where: any = { shopId };
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    return prisma.customer.findMany({
      where,
      orderBy: { outstandingBalance: "desc" },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
  }

  static async getCustomerById(shopId: string, id: string) {
    return prisma.customer.findFirst({
      where: { id, shopId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            product: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  static async createCustomer(params: { shopId: string; name: string; phone?: string }) {
    const { shopId, name, phone } = params;
    return prisma.customer.create({
      data: {
        shopId,
        name,
        phone,
        outstandingBalance: 0,
      },
    });
  }
}
