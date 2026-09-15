import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../src/lib/prisma";
import { PurchaseService } from "../src/services/PurchaseService";
import { SalesService } from "../src/services/SalesService";
import { KhataService } from "../src/services/KhataService";
import { PricingService } from "../src/services/PricingService";
import { InventoryService } from "../src/services/InventoryService";
import { RuleEngineAIProvider } from "../src/lib/ai/rule-engine-provider";
import { LocalNLPProvider } from "../src/lib/ai/local-nlp-provider";
import { AIContext } from "../src/lib/ai/types";
import { VectorStore } from "../src/lib/rag/VectorStore";
import { DemandForecaster } from "../src/lib/rag/DemandForecaster";

describe("ShopMate Core Business & AI Test Suite", () => {
  let shopId: string;
  const aiProvider = new RuleEngineAIProvider();

  beforeAll(async () => {
    // Look up or create test shop
    let shop = await prisma.shop.findFirst();
    if (!shop) {
      const user = await prisma.user.create({
        data: {
          name: "Test User",
          email: "test@shopmate.ai",
          passwordHash: "test_hash",
        },
      });
      shop = await prisma.shop.create({
        data: {
          name: "Test Kirana",
          ownerId: user.id,
        },
      });
    }
    shopId = shop.id;
  });

  // 1. INVENTORY PURCHASE TEST
  it("Inventory: Purchase 10 kg -> Expected stock increases by 10 and price calculated", async () => {
    // Initial rice check
    let rice = await prisma.product.findFirst({
      where: { shopId, name: "Rice" },
    });
    const initialStock = rice?.currentStock || 0;

    const result = await PurchaseService.recordPurchase({
      shopId,
      productName: "Rice",
      quantity: 10,
      unit: "kg",
      totalAmount: 520,
      source: "TEST",
    });

    expect(result.product.currentStock).toBe(initialStock + 10);
    expect(result.purchasePricePerUnit).toBe(52);
    expect(result.transaction.type).toBe("PURCHASE");
    expect(result.transaction.amount).toBe(520);
    expect(result.movement.type).toBe("PURCHASE");
    expect(result.movement.quantity).toBe(10);
  });

  // 2. PRICING & PROFIT MARGIN TEST
  it("Pricing: Purchase = ₹52, Profit = ₹10 -> Expected selling price = ₹62", async () => {
    let rice = await prisma.product.findFirst({
      where: { shopId, name: "Rice" },
    });
    expect(rice).toBeDefined();

    const updated = await PricingService.setProfitMargin(shopId, rice!.id, 10);
    expect(updated.profitAmount).toBe(10);
    expect(updated.sellingPrice).toBe(rice!.purchasePrice + 10);
    expect(updated.sellingPrice).toBe(62);
  });

  // 3. NORMAL SALE TEST
  it("Sales: Sell 5 kg -> Expected stock decreases by 5", async () => {
    let rice = await prisma.product.findFirst({
      where: { shopId, name: "Rice" },
    });
    const beforeStock = rice!.currentStock;

    const result = await SalesService.recordSale({
      shopId,
      productName: "Rice",
      quantity: 5,
      totalAmount: 310,
      source: "TEST",
    });

    expect(result.product.currentStock).toBe(beforeStock - 5);
    expect(result.transaction.type).toBe("SALE");
    expect(result.transaction.amount).toBe(310);
  });

  // 4. CREDIT SALE (KHATA) TEST
  it("Credit Sale: Sell 2 kg to Ramesh on khata -> Expected balance increases by ₹124 and stock decreases by 2 kg", async () => {
    let ramesh = await prisma.customer.findFirst({
      where: { shopId, name: "Ramesh" },
    });
    const initialBalance = ramesh?.outstandingBalance || 0;

    let rice = await prisma.product.findFirst({
      where: { shopId, name: "Rice" },
    });
    const initialRiceStock = rice!.currentStock;

    const result = await KhataService.recordCreditSale({
      shopId,
      customerName: "Ramesh",
      productName: "Rice",
      quantity: 2,
      source: "TEST",
    });

    expect(result.amount).toBe(2 * rice!.sellingPrice); // 2 * 62 = 124
    expect(result.customer.outstandingBalance).toBe(initialBalance + 124);
    expect(result.product.currentStock).toBe(initialRiceStock - 2);
    expect(result.transaction.type).toBe("CREDIT_SALE");
  });

  // 5. KHATA PAYMENT TEST
  it("Payment: Ramesh pays ₹124 -> Expected balance decreases by ₹124", async () => {
    let ramesh = await prisma.customer.findFirst({
      where: { shopId, name: "Ramesh" },
    });
    const currentBalance = ramesh!.outstandingBalance;

    const result = await KhataService.recordPayment({
      shopId,
      customerName: "Ramesh",
      amount: 124,
      source: "TEST",
    });

    expect(result.newBalance).toBe(currentBalance - 124);
    expect(result.transaction.type).toBe("PAYMENT");
    expect(result.payment.status).toBe("SUCCESS");
  });

  // 6. ERROR PREVENTION: OVER-SELLING TEST
  it("Stock validation: Stock = 20, Sale = 50 -> Expected rejection with helpful suggestion", async () => {
    // Create a product with exactly 20 kg
    const tempProduct = await prisma.product.create({
      data: {
        shopId,
        name: "Test Pulse",
        currentStock: 20,
        sellingPrice: 100,
        unit: "kg",
      },
    });

    await expect(
      SalesService.recordSale({
        shopId,
        productName: "Test Pulse",
        quantity: 50,
      })
    ).rejects.toThrow("Insufficient stock");

    // Clean up
    await prisma.product.delete({ where: { id: tempProduct.id } });
  });

  // 7. MINIMUM STOCK ALERT TEST
  it("Minimum stock: Stock = 8, Minimum = 10 -> Expected low-stock alert triggered", async () => {
    const alertProduct = await prisma.product.create({
      data: {
        shopId,
        name: "Test Mustard",
        currentStock: 15,
        minimumStock: 10,
        unit: "kg",
      },
    });

    // Reduce stock by 7 to reach 8 kg (which is <= 10 kg)
    await InventoryService.adjustStock({
      shopId,
      productId: alertProduct.id,
      quantityChange: -7,
      type: "SALE",
    });

    const notif = await prisma.notification.findFirst({
      where: {
        shopId,
        title: { contains: "Test Mustard" },
      },
      orderBy: { createdAt: "desc" },
    });

    expect(notif).toBeDefined();
    expect(notif?.severity).toBe("WARNING");

    // Clean up
    await prisma.notification.deleteMany({ where: { shopId, title: { contains: "Test Mustard" } } });
    await prisma.inventoryMovement.deleteMany({ where: { productId: alertProduct.id } });
    await prisma.product.delete({ where: { id: alertProduct.id } });
  });

  // 8. AI INTENT PARSER VARIATIONS & NATURAL LANGUAGE
  describe("AI Intent Engine NLP Variations", () => {
    const dummyContext: AIContext = {
      shopName: "Ramesh Kirana",
      currency: "INR",
      products: [
        { id: "1", name: "Rice", currentStock: 45, unit: "kg", purchasePrice: 52, sellingPrice: 62, minimumStock: 10 },
        { id: "2", name: "Sugar", currentStock: 30, unit: "kg", purchasePrice: 36, sellingPrice: 42, minimumStock: 10 },
      ],
      customers: [
        { id: "c1", name: "Ramesh", outstandingBalance: 450 },
        { id: "c2", name: "Suresh", outstandingBalance: 1250 },
      ],
    };

    it("Parses purchase: 'I bought 10 kilos of rice for ₹520'", async () => {
      const parsed = await aiProvider.parseCommand("I bought 10 kilos of rice for ₹520", dummyContext);
      expect(parsed.intent).toBe("record_purchase");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(10);
      expect(parsed.entities.total_amount).toBe(520);
    });

    it("Parses pricing: 'I want ₹10 profit per kilo on rice'", async () => {
      const parsed = await aiProvider.parseCommand("I want ₹10 profit per kilo on rice", dummyContext);
      expect(parsed.intent).toBe("set_profit_margin");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.profit_amount).toBe(10);
    });

    it("Parses query: 'What is the selling price of rice?'", async () => {
      const parsed = await aiProvider.parseCommand("What is the selling price of rice?", dummyContext);
      expect(parsed.intent).toBe("get_product_price");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.speech_response).toContain("62");
    });

    it("Parses credit khata: 'Ramesh took 2 kilos of rice on khata'", async () => {
      const parsed = await aiProvider.parseCommand("Ramesh took 2 kilos of rice on khata", dummyContext);
      expect(parsed.intent).toBe("record_credit_sale");
      expect(parsed.entities.customer_name).toBe("Ramesh");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(2);
      expect(parsed.entities.total_amount).toBe(124);
    });

    it("Parses Hinglish credit: 'Ramesh ko 2 kilo rice udhaar mein diya'", async () => {
      const parsed = await aiProvider.parseCommand("Ramesh ko 2 kilo rice udhaar mein diya", dummyContext);
      expect(parsed.intent).toBe("record_credit_sale");
      expect(parsed.entities.customer_name).toBe("Ramesh");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(2);
    });

    it("Parses payment: 'Ramesh paid ₹124'", async () => {
      const parsed = await aiProvider.parseCommand("Ramesh paid ₹124", dummyContext);
      expect(parsed.intent).toBe("record_payment");
      expect(parsed.entities.customer_name).toBe("Ramesh");
      expect(parsed.entities.amount).toBe(124);
    });

    it("Handles ambiguous command with conversational follow-up prompt", async () => {
      const parsed = await aiProvider.parseCommand("I sold some rice", dummyContext);
      expect(parsed.clarification_question).toBeDefined();
      expect(parsed.clarification_question).toContain("How many kg of Rice did you sell?");
    });

    // ── Telugu NLP Tests (use LocalNLPProvider which has Telugu support) ──
    const teluguNLP = new LocalNLPProvider();

    it("Parses Telugu purchase: '10 kilu biyyam ₹520 ki konnanu'", async () => {
      const parsed = await teluguNLP.parseCommand("10 kilu biyyam ₹520 ki konnanu", dummyContext);
      expect(parsed.intent).toBe("record_purchase");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(10);
    });

    it("Parses Telugu price query: 'biyyam dhara enta?'", async () => {
      const parsed = await teluguNLP.parseCommand("biyyam dhara enta?", dummyContext);
      expect(parsed.intent).toBe("get_product_price");
      expect(parsed.entities.product_name).toBe("Rice");
    });

    it("Parses Telugu payment: 'Ramesh ₹124 chellimpu chesadu'", async () => {
      const parsed = await teluguNLP.parseCommand("Ramesh ₹124 chellimpu chesadu", dummyContext);
      expect(parsed.intent).toBe("record_payment");
      expect(parsed.entities.customer_name).toBe("Ramesh");
      expect(parsed.entities.amount).toBe(124);
    });

    it("Parses Telugu credit: 'Ramesh 2 kilu biyyam udharo'", async () => {
      const parsed = await teluguNLP.parseCommand("Ramesh 2 kilu biyyam udharo", dummyContext);
      expect(parsed.intent).toBe("record_credit_sale");
      expect(parsed.entities.customer_name).toBe("Ramesh");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(2);
    });
  });

  // ── RAG Engine Tests ──────────────────────────────────────────────────────
  describe("RAG Engine — TF-IDF Vector Store & Demand Forecaster", () => {
    it("VectorStore: indexes documents and returns similarity-ranked results", () => {
      const store = new VectorStore();
      store.load([
        { id: "1", text: "Sold 5 kg rice to Ramesh for ₹310 cash sale", metadata: { type: "SALE" } },
        { id: "2", text: "Purchased 10 kg sugar from supplier for ₹360", metadata: { type: "PURCHASE" } },
        { id: "3", text: "Ramesh paid ₹200 cash payment towards credit balance", metadata: { type: "PAYMENT" } },
        { id: "4", text: "Sold 2 litres oil to Suresh UPI payment", metadata: { type: "SALE" } },
        { id: "5", text: "Credit sale 3 kg rice to Lakshmi on khata", metadata: { type: "CREDIT_SALE" } },
      ]);

      expect(store.size).toBe(5);

      // Query for rice — should rank rice transactions higher
      const results = store.search("rice sale", 3);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].score).toBeGreaterThan(0);

      // Top result should be related to rice
      const topText = results[0].document.text.toLowerCase();
      expect(topText).toContain("rice");
    });

    it("VectorStore: cosine similarity returns 0 for completely unrelated queries", () => {
      const store = new VectorStore();
      store.load([
        { id: "1", text: "rice purchase kg stock", metadata: {} },
      ]);

      const results = store.search("zzzzxqwhjk", 3);
      expect(results.length).toBe(0);
    });

    it("DemandForecaster: computes 7-day moving average correctly", () => {
      const fc = new DemandForecaster();

      const today = new Date();
      const history = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        history.push({ date: d.toISOString().split("T")[0], quantity: 10, revenue: 620 });
      }

      const result = fc.forecast("Rice", "kg", 50, history);
      expect(result.avg7Day).toBe(10);
      expect(result.daysUntilStockout).toBe(5); // 50 stock / 10 per day
      expect(result.productName).toBe("Rice");
      expect(result.demandScore).toBe(20); // 10/50 * 100
    });

    it("DemandForecaster: detects rising velocity trend", () => {
      const fc = new DemandForecaster();

      const today = new Date();
      const history = [];
      // First 15 days: low sales
      for (let i = 16; i <= 30; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        history.push({ date: d.toISOString().split("T")[0], quantity: 2, revenue: 124 });
      }
      // Last 15 days: high sales (rising)
      for (let i = 1; i <= 15; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        history.push({ date: d.toISOString().split("T")[0], quantity: 10, revenue: 620 });
      }

      const result = fc.forecast("Rice", "kg", 100, history);
      expect(result.velocityTrend).toBe("rising");
    });
  });
});
