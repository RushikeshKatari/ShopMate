import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ShopMate database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.aICommand.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash("password123", 10);
  const demoUser = await prisma.user.create({
    data: {
      name: "Ramesh Kumar",
      email: "demo@shopmate.ai",
      phone: "9876543210",
      passwordHash,
    },
  });

  // 2. Create Demo Shop
  const demoShop = await prisma.shop.create({
    data: {
      name: "Ramesh Kirana Store",
      ownerId: demoUser.id,
      phone: "9876543210",
      address: "Shop #4, Market Road, Bengaluru, Karnataka",
      currency: "INR",
    },
  });

  // 3. Shop Settings
  await prisma.setting.create({
    data: {
      shopId: demoShop.id,
      shopName: "Ramesh Kirana Store",
      language: "en-IN",
      currency: "INR",
      voiceEnabled: true,
      voiceResponseEnabled: true,
      lowStockNotifications: true,
      offlineMode: false,
    },
  });

  // 4. Create Products
  // Low stock products: Wheat Flour (8 <= 10), Tea (12 <= 15), Biscuits (25 <= 30) -> Exactly 3 low stock items!
  const rice = await prisma.product.create({
    data: {
      shopId: demoShop.id,
      name: "Rice",
      category: "Grains",
      unit: "kg",
      currentStock: 45,
      minimumStock: 10,
      purchasePrice: 52,
      sellingPrice: 62,
      profitAmount: 10,
    },
  });

  const sugar = await prisma.product.create({
    data: {
      shopId: demoShop.id,
      name: "Sugar",
      category: "Essentials",
      unit: "kg",
      currentStock: 30,
      minimumStock: 10,
      purchasePrice: 36,
      sellingPrice: 42,
      profitAmount: 6,
    },
  });

  const oil = await prisma.product.create({
    data: {
      shopId: demoShop.id,
      name: "Oil",
      category: "Oils",
      unit: "litre",
      currentStock: 20,
      minimumStock: 5,
      purchasePrice: 125,
      sellingPrice: 140,
      profitAmount: 15,
    },
  });

  const wheatFlour = await prisma.product.create({
    data: {
      shopId: demoShop.id,
      name: "Wheat Flour",
      category: "Flours",
      unit: "kg",
      currentStock: 8, // Low Stock! (8 <= 10)
      minimumStock: 10,
      purchasePrice: 30,
      sellingPrice: 36,
      profitAmount: 6,
    },
  });

  const tea = await prisma.product.create({
    data: {
      shopId: demoShop.id,
      name: "Tea",
      category: "Beverages",
      unit: "packet",
      currentStock: 12, // Low Stock! (12 <= 15)
      minimumStock: 15,
      purchasePrice: 110,
      sellingPrice: 130,
      profitAmount: 20,
    },
  });

  const biscuits = await prisma.product.create({
    data: {
      shopId: demoShop.id,
      name: "Biscuits",
      category: "Snacks",
      unit: "packet",
      currentStock: 25, // Low Stock! (25 <= 30)
      minimumStock: 30,
      purchasePrice: 22,
      sellingPrice: 30,
      profitAmount: 8,
    },
  });

  // 5. Create Customers
  // Total Outstanding Khata: 450 + 1250 + 200 + 0 + 320 + 8500 + 7680 = ₹18,400
  const ramesh = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Ramesh",
      phone: "9811122233",
      outstandingBalance: 450,
    },
  });

  const suresh = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Suresh",
      phone: "9822233344",
      outstandingBalance: 1250,
    },
  });

  const anil = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Anil",
      phone: "9833344455",
      outstandingBalance: 200,
    },
  });

  const lakshmi = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Lakshmi",
      phone: "9844455566",
      outstandingBalance: 0,
    },
  });

  const vikram = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Vikram",
      phone: "9855566677",
      outstandingBalance: 320,
    },
  });

  const sharmaJi = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Sharma Ji",
      phone: "9866677788",
      outstandingBalance: 8500,
    },
  });

  const rajesh = await prisma.customer.create({
    data: {
      shopId: demoShop.id,
      name: "Rajesh Caterers",
      phone: "9877788899",
      outstandingBalance: 7680,
    },
  });

  // 6. Today's Transactions to match exact metrics:
  // Today's Sales = ₹8,450
  // Today's Credit Sales = ₹1,200
  // Today's Cash/UPI = ₹7,250
  const today = new Date();

  // Transaction 1: Rice Cash Sale: 50 kg * 62 = 3,100 (CASH)
  await prisma.transaction.create({
    data: {
      shopId: demoShop.id,
      type: "SALE",
      productId: rice.id,
      quantity: 50,
      unit: "kg",
      amount: 3100,
      paymentMethod: "CASH",
      description: "Counter sale: 50 kg Rice",
      source: "MANUAL",
      status: "COMPLETED",
      createdAt: new Date(today.getTime() - 4 * 3600000),
    },
  });

  // Transaction 2: Oil UPI Sale: 25 L * 140 = 3,500 (UPI)
  await prisma.transaction.create({
    data: {
      shopId: demoShop.id,
      type: "SALE",
      productId: oil.id,
      quantity: 25,
      unit: "litre",
      amount: 3500,
      paymentMethod: "UPI",
      description: "UPI sale: 25 L Oil",
      source: "VOICE",
      status: "COMPLETED",
      createdAt: new Date(today.getTime() - 3 * 3600000),
    },
  });

  // Transaction 3: Sugar Cash Sale: 15 kg * 42 = 630 (CASH)
  // Total Cash/UPI so far = 3100 + 3500 + 630 = 7,230. Plus 20 = 7,250!
  await prisma.transaction.create({
    data: {
      shopId: demoShop.id,
      type: "SALE",
      productId: sugar.id,
      quantity: 15,
      unit: "kg",
      amount: 630,
      paymentMethod: "CASH",
      description: "Counter sale: 15 kg Sugar",
      source: "MANUAL",
      status: "COMPLETED",
      createdAt: new Date(today.getTime() - 2 * 3600000),
    },
  });

  // Transaction 4: Biscuits Cash Sale = 20 (CASH) -> Cash/UPI Total = 7,250!
  await prisma.transaction.create({
    data: {
      shopId: demoShop.id,
      type: "SALE",
      productId: biscuits.id,
      quantity: 1,
      unit: "packet",
      amount: 20,
      paymentMethod: "CASH",
      description: "Counter sale: 1 packet Biscuits",
      source: "MANUAL",
      status: "COMPLETED",
      createdAt: new Date(today.getTime() - 90 * 60000),
    },
  });

  // Transaction 5: Credit Sale to Suresh: 20 kg Rice on Khata = 1,240 (or 1,200)
  // Let's make credit sale: amount = 1,200 to Suresh.
  await prisma.transaction.create({
    data: {
      shopId: demoShop.id,
      type: "CREDIT_SALE",
      productId: rice.id,
      customerId: suresh.id,
      quantity: 19.35,
      unit: "kg",
      amount: 1200,
      paymentMethod: "CREDIT",
      description: "Credit sale to Suresh on Khata",
      source: "VOICE",
      status: "COMPLETED",
      createdAt: new Date(today.getTime() - 60 * 60000),
    },
  });

  // Total Today Sales = 3100 + 3500 + 630 + 20 + 1200 = ₹8,450!
  // Credit = ₹1,200
  // Cash/UPI = ₹7,250
  // Low Stock Items = 3 (Wheat Flour, Tea, Biscuits)
  // Outstanding Khata = ₹18,400

  // 7. Seed Notifications for Low Stock
  await prisma.notification.createMany({
    data: [
      {
        shopId: demoShop.id,
        type: "LOW_STOCK",
        title: "Low Stock: Wheat Flour",
        message: "Current stock: 8 kg (Minimum required: 10 kg)",
        severity: "WARNING",
        read: false,
      },
      {
        shopId: demoShop.id,
        type: "LOW_STOCK",
        title: "Low Stock: Tea",
        message: "Current stock: 12 packets (Minimum required: 15 packets)",
        severity: "WARNING",
        read: false,
      },
      {
        shopId: demoShop.id,
        type: "LOW_STOCK",
        title: "Low Stock: Biscuits",
        message: "Current stock: 25 packets (Minimum required: 30 packets)",
        severity: "WARNING",
        read: false,
      },
    ],
  });

  console.log("Seeding completed successfully!");
  console.log("Demo Credentials: demo@shopmate.ai / password123 (or Phone: 9876543210)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
