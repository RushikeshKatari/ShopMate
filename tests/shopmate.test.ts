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
import { createUpiPaymentUri, normalizeUpiId } from "../src/lib/payments/upi";
import { BillSplittingService } from "../src/services/BillSplittingService";

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

    it("fills a purchase amount in a follow-up turn and calculates cost per unit", async () => {
      const localNLP = new LocalNLPProvider();
      const firstTurn = await localNLP.parseCommand("I bought 5 kg rice", dummyContext);
      expect(firstTurn.intent).toBe("record_purchase");
      expect(firstTurn.clarification_question).toContain("For how many rupees");

      const secondTurn = await localNLP.parseCommand("500 rupees", {
        ...dummyContext,
        conversationState: {
          pendingIntent: firstTurn.intent,
          pendingEntities: firstTurn.entities,
          missingSlot: "amount",
        },
      });
      expect(secondTurn.entities.total_amount).toBe(500);
      expect(secondTurn.entities.purchase_price_per_unit).toBe(100);
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

    it("parses Telugu-script purchase and produces a Telugu response", async () => {
      const parsed = await teluguNLP.parseCommand("10 కేజీల బియ్యం ₹520 కి కొన్నాను", {
        ...dummyContext,
        language: "te-IN",
      });
      expect(parsed.intent).toBe("record_purchase");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(10);
      expect(parsed.entities.total_amount).toBe(520);
      expect(parsed.is_telugu).toBe(true);
    });

    it("matches Telugu-script customer names against the khata ledger", async () => {
      const parsed = await teluguNLP.parseCommand("రమేష్ 2 కేజీల బియ్యం ఖాతాలో తీసుకున్నాడు", {
        ...dummyContext,
        language: "te-IN",
      });
      expect(parsed.intent).toBe("record_credit_sale");
      expect(parsed.entities.customer_name).toBe("Ramesh");
      expect(parsed.entities.product_name).toBe("Rice");
      expect(parsed.entities.quantity).toBe(2);
    });

    it("handles Telugu greeting and spoken confirmation intents", async () => {
      const greeting = await teluguNLP.parseCommand("నమస్కారం", { ...dummyContext, language: "te-IN" });
      const confirmation = await teluguNLP.parseCommand("అవును", { ...dummyContext, language: "te-IN" });
      expect(greeting.intent).toBe("greeting");
      expect(greeting.speech_response_telugu).toContain("నమస్కారం");
      expect(confirmation.intent).toBe("confirm_action");
    });
  });

  // ── UPI QR Tests ──────────────────────────────────────────────────────────
  describe("UPI QR recipient", () => {
    it("normalizes a valid shop UPI ID and places it in the payment URI", () => {
      const upiId = normalizeUpiId("  Ramesh.Store@OKHDFC  ");
      expect(upiId).toBe("ramesh.store@okhdfc");

      const uri = createUpiPaymentUri({
        upiId: upiId!,
        payeeName: "Ramesh Kirana Store",
        amount: 124,
        note: "Khata Settlement - Ramesh",
      });
      const query = new URL(uri).searchParams;
      expect(query.get("pa")).toBe("ramesh.store@okhdfc");
      expect(query.get("am")).toBe("124.00");
    });

    it("rejects malformed UPI IDs", () => {
      expect(() => normalizeUpiId("not a UPI ID")).toThrow("valid UPI ID");
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

    it("VectorStore: retains Telugu-script terms for offline retrieval", () => {
      const store = new VectorStore();
      store.load([
        { id: "1", text: "బియ్యం 5 కిలోలు అమ్మకం", metadata: { product: "Rice" } },
        { id: "2", text: "చక్కెర కొనుగోలు 10 కిలోలు", metadata: { product: "Sugar" } },
      ]);

      const results = store.search("బియ్యం అమ్మకం", 1);
      expect(results).toHaveLength(1);
      expect(results[0].document.metadata.product).toBe("Rice");
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

  // ── SmartCheckout Enterprise Bill-Splitting Engine Tests ───────────────────
  describe("SmartCheckout Enterprise Bill-Splitting Engine (Specification Cases 1-7)", () => {
    // Case 1: Standard Fit
    // Cart: ₹500 + ₹600 + ₹700 -> Result: ₹1,800 in one bill
    it("Case 1: ₹500 + ₹600 + ₹700 packs into exactly one bill of ₹1,800", () => {
      const result = BillSplittingService.splitCart([
        { name: "Oil", unitPrice: 500, quantity: 1 },
        { name: "Rice", unitPrice: 600, quantity: 1 },
        { name: "Dal", unitPrice: 700, quantity: 1 },
      ]);

      expect(result.highValueBills).toHaveLength(0);
      expect(result.standardBills).toHaveLength(1);
      expect(result.standardBills[0].total).toBe(1800);
      expect(result.standardBills[0].items).toHaveLength(3);
    });

    // Case 2: Best-Fit Split
    // Cart: ₹1,000 + ₹900 + ₹500 -> Result: Bill 1 = ₹1,900, Bill 2 = ₹500
    it("Case 2: ₹1,000 + ₹900 + ₹500 splits into Bill 1 (₹1,900) and Bill 2 (₹500)", () => {
      const result = BillSplittingService.splitCart([
        { name: "Item A", unitPrice: 1000, quantity: 1 },
        { name: "Item B", unitPrice: 900, quantity: 1 },
        { name: "Item C", unitPrice: 500, quantity: 1 },
      ]);

      expect(result.highValueBills).toHaveLength(0);
      expect(result.standardBills).toHaveLength(2);
      expect(result.standardBills[0].total).toBe(1900); // 1000 + 900
      expect(result.standardBills[1].total).toBe(500); // 500
    });

    // Case 3: High-Value + Standard
    // Cart: ₹500 + ₹700 + ₹900 + ₹2,500 -> Result: Bill 1 = ₹1,900, Bill 2 = ₹2,500 (standalone)
    it("Case 3: ₹500 + ₹700 + ₹900 + ₹2,500 puts ₹2,500 in standalone bill and packs standard items into ₹1,900 bill", () => {
      const result = BillSplittingService.splitCart([
        { name: "Item 1", unitPrice: 500, quantity: 1 },
        { name: "Item 2", unitPrice: 700, quantity: 1 },
        { name: "Item 3", unitPrice: 900, quantity: 1 },
        { name: "TV", unitPrice: 2500, quantity: 1 },
      ]);

      expect(result.highValueBills).toHaveLength(1);
      expect(result.highValueBills[0].total).toBe(2500);
      expect(result.highValueBills[0].items[0].name).toBe("TV");
      expect(result.highValueBills[0].reason).toContain("exceeds threshold");

      // Remaining items: 900 + 700 + 500 = 2100 > 1999, so 900 + 700 = 1600 or 900 + 700 + 500 packed deterministically
      const totalStandard = result.standardBills.reduce((s, b) => s + b.total, 0);
      expect(totalStandard).toBe(2100);
      for (const bill of result.standardBills) {
        expect(bill.total).toBeLessThanOrEqual(1999);
      }
    });

    // Case 4: Multiple High-Value Items
    // Cart: ₹2,500 + ₹5,000 + ₹300 + ₹400 + ₹500 -> Result: Bill 1 = ₹2,500, Bill 2 = ₹5,000, Bill 3 = ₹1,200
    it("Case 4: ₹2,500 + ₹5,000 + ₹300 + ₹400 + ₹500 generates two high-value bills and one standard bill of ₹1,200", () => {
      const result = BillSplittingService.splitCart([
        { name: "Appliance A", unitPrice: 2500, quantity: 1 },
        { name: "Appliance B", unitPrice: 5000, quantity: 1 },
        { name: "Small 1", unitPrice: 300, quantity: 1 },
        { name: "Small 2", unitPrice: 400, quantity: 1 },
        { name: "Small 3", unitPrice: 500, quantity: 1 },
      ]);

      expect(result.highValueBills).toHaveLength(2);
      expect(result.highValueBills[0].total).toBe(2500);
      expect(result.highValueBills[1].total).toBe(5000);

      expect(result.standardBills).toHaveLength(1);
      expect(result.standardBills[0].total).toBe(1200); // 300 + 400 + 500
    });

    // Case 5: Exact ₹1,999 Threshold
    it("Case 5: ₹1,999 item generates exactly one standard bill of ₹1,999", () => {
      const result = BillSplittingService.splitCart([
        { name: "Cooktop", unitPrice: 1999, quantity: 1 },
      ]);

      expect(result.highValueBills).toHaveLength(0);
      expect(result.standardBills).toHaveLength(1);
      expect(result.standardBills[0].total).toBe(1999);
    });

    // Case 6: Exact ₹2,000 Boundary Condition
    it("Case 6: Explicitly configurable boundary condition for ₹2,000", () => {
      // Config A: GREATER_THAN (default)
      const resultDefault = BillSplittingService.splitCart(
        [{ name: "Grinder", unitPrice: 2000, quantity: 1 }],
        { highValueThreshold: 2000, boundaryRule: "GREATER_THAN" }
      );
      expect(resultDefault.highValueBills).toHaveLength(0);

      // Config B: GREATER_THAN_OR_EQUAL
      const resultGte = BillSplittingService.splitCart(
        [{ name: "Grinder", unitPrice: 2000, quantity: 1 }],
        { highValueThreshold: 2000, boundaryRule: "GREATER_THAN_OR_EQUAL" }
      );
      expect(resultGte.highValueBills).toHaveLength(1);
      expect(resultGte.highValueBills[0].total).toBe(2000);
    });

    // Case 7: Duplicate High-Value Products
    // Cart: ₹2,500 × 2 -> Two separate high-value bills, never merged into ₹5,000
    it("Case 7: Duplicate high-value products (₹2,500 × 2) generate two separate standalone bills", () => {
      const result = BillSplittingService.splitCart([
        { name: "Audio Speaker", unitPrice: 2500, quantity: 2 },
      ]);

      expect(result.highValueBills).toHaveLength(2);
      expect(result.highValueBills[0].total).toBe(2500);
      expect(result.highValueBills[1].total).toBe(2500);
      expect(result.standardBills).toHaveLength(0);
    });

    // Deterministic Algorithm Verification
    it("Deterministic: Same cart and configuration produces identical split outcome", () => {
      const cart = [
        { name: "Rice", unitPrice: 800, quantity: 1 },
        { name: "Oil", unitPrice: 500, quantity: 1 },
        { name: "TV", unitPrice: 25000, quantity: 1 },
        { name: "Soap", unitPrice: 200, quantity: 1 },
        { name: "Biscuits", unitPrice: 300, quantity: 1 },
      ];

      const run1 = BillSplittingService.splitCart(cart);
      const run2 = BillSplittingService.splitCart(cart);

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });

    // CheckoutSession Integration with Database & UPI QR Generation
    it("createCheckoutSession: creates parent session CHK-*, child invoices, and UPI QR codes", async () => {
      const session = await BillSplittingService.createCheckoutSession({
        shopId,
        items: [
          { name: "Rice 5kg", unitPrice: 800, quantity: 1 },
          { name: "Cooking Oil 2L", unitPrice: 500, quantity: 1 },
          { name: "Smart TV", unitPrice: 25000, quantity: 1 },
          { name: "Bath Soap", unitPrice: 200, quantity: 1 },
          { name: "Biscuits", unitPrice: 300, quantity: 1 },
        ],
      });

      expect(session.checkoutSessionId).toMatch(/^CHK-\d{8}-\d{6}$/);
      expect(session.totalInvoicesCount).toBe(2); // TV (₹25,000) + Standard bucket (800+500+200+300 = ₹1,800)
      expect(session.highValueInvoicesCount).toBe(1);
      expect(session.standardInvoicesCount).toBe(1);
      expect(session.totalCartValue).toBe(26800);

      // Verify each invoice has dynamic UPI QR code
      for (const inv of session.invoices) {
        expect(inv.invoiceNumber).toMatch(/^INV-\d{3}$/);
        expect(inv.parentCheckoutId).toBe(session.checkoutSessionId);
        expect(inv.upiUri).toContain("upi://pay");
        expect(inv.qrDataUrl).toMatch(/^data:image\/png;base64,/);
        expect(inv.paymentStatus).toBe("PENDING");
        expect(inv.paymentId).toBeDefined();
      }
    });
  });
});

