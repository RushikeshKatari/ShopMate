/**
 * ShopMate RAG Engine — Retrieve → Augment → Generate
 *
 * R — Retrieve: Query SQLite (via Prisma) for semantically relevant shop records
 * A — Augment:  Build RAGContext from retrieved data (demand forecast, customer insight, similar txns)
 * G — Generate: Enrich NLP speech response with retrieved context tips
 *
 * 100% local. Zero external API. Uses TF-IDF vector store + moving-average ML.
 */

import { PrismaClient } from "@prisma/client";
import { VectorStore, VectorDocument } from "./VectorStore";
import { DemandForecaster, DailySalesPoint, ForecastResult } from "./DemandForecaster";

const prisma = new PrismaClient();
const forecaster = new DemandForecaster();

export interface RAGContext {
  /** Top-k retrieved transaction documents */
  retrieved: Array<{ text: string; similarity: number; metadata: Record<string, unknown> }>;
  /** Demand forecast for the product involved (if any) */
  forecast?: ForecastResult;
  /** Human-readable insight tip to append to the voice response */
  tip?: string;
  /** Customer-level insight */
  customerInsight?: string;
  /** Retrieval metadata for the Intelligence page */
  meta: {
    retrievedCount: number;
    retrievalMs: number;
    augmentationMs: number;
    corpusSize: number;
  };
}

export interface RAGQuery {
  shopId: string;
  intent: string;
  productName?: string;
  customerName?: string;
  amount?: number;
}

export class ShopRAGEngine {
  private store = new VectorStore();
  private lastIndexedShop: string | null = null;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Full RAG pipeline: retrieve → augment → generate tip */
  async query(q: RAGQuery): Promise<RAGContext> {
    const t0 = Date.now();

    // R — Retrieve
    await this.ensureIndexed(q.shopId);
    const queryText = this.buildQueryText(q);
    const retrieved = this.store.search(queryText, 5);
    const retrievalMs = Date.now() - t0;

    // A — Augment
    const t1 = Date.now();
    const forecast = q.productName
      ? await this.getForecast(q.shopId, q.productName)
      : undefined;

    const customerInsight = q.customerName
      ? await this.getCustomerInsight(q.shopId, q.customerName)
      : undefined;

    const tip = this.generateTip(q, forecast, customerInsight, retrieved);
    const augmentationMs = Date.now() - t1;

    return {
      retrieved: retrieved.map(r => ({
        text: r.document.text,
        similarity: Math.round(r.score * 1000) / 1000,
        metadata: r.document.metadata,
      })),
      forecast,
      tip,
      customerInsight,
      meta: {
        retrievedCount: retrieved.length,
        retrievalMs,
        augmentationMs,
        corpusSize: this.store.size,
      },
    };
  }

  /** Get all product demand forecasts for a shop (Intelligence page) */
  async getAllForecasts(shopId: string): Promise<ForecastResult[]> {
    const products = await prisma.product.findMany({ where: { shopId } });
    const results: ForecastResult[] = [];

    for (const product of products) {
      const history = await this.getSalesHistory(shopId, product.id);
      results.push(forecaster.forecast(product.name, product.unit, product.currentStock, history));
    }

    return results.sort((a, b) => b.demandScore - a.demandScore);
  }

  /** Get top-k similar transactions (Intelligence page RAG explorer) */
  async similarTransactions(shopId: string, query: string, topK = 5) {
    await this.ensureIndexed(shopId);
    return this.store
      .search(query, topK, doc => doc.metadata.shopId === shopId)
      .map(r => ({ text: r.document.text, similarity: r.score, metadata: r.document.metadata }));
  }

  /** Get shop-level insights for the Intelligence page */
  async getShopInsights(shopId: string) {
    const [products, customers, transactions] = await Promise.all([
      prisma.product.findMany({ where: { shopId } }),
      prisma.customer.findMany({ where: { shopId } }),
      prisma.transaction.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { product: true, customer: true },
      }),
    ]);

    const forecasts = await this.getAllForecasts(shopId);

    // Customer risk scores: ratio of outstanding balance to total transactions
    const customerRisks = customers.map(c => {
      const txns = transactions.filter(t => t.customerId === c.id);
      const totalCredit = txns.filter(t => t.type === "CREDIT_SALE").reduce((s, t) => s + t.amount, 0);
      const totalPaid = txns.filter(t => t.type === "PAYMENT").reduce((s, t) => s + t.amount, 0);
      const riskScore = totalCredit > 0 ? Math.min(100, Math.round((c.outstandingBalance / (totalCredit + 1)) * 100)) : 0;
      return { name: c.name, outstandingBalance: c.outstandingBalance, totalCredit, totalPaid, riskScore };
    }).sort((a, b) => b.riskScore - a.riskScore);

    // Revenue stats
    const today = new Date();
    const day7ago = new Date(today); day7ago.setDate(today.getDate() - 7);
    const recentTxns = transactions.filter(t => new Date(t.createdAt) >= day7ago);
    const weeklyRevenue = recentTxns.filter(t => ["SALE", "CREDIT_SALE"].includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const totalOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);

    // Top products by demand score
    const topProducts = forecasts.slice(0, 3);

    // Low stock alerts
    const lowStock = products.filter(p => p.currentStock <= p.minimumStock);

    return {
      forecasts,
      customerRisks,
      topProducts,
      lowStock,
      weeklyRevenue,
      totalOutstanding,
      corpusSize: this.store.size,
    };
  }

  // ---------------------------------------------------------------------------
  // RAG internals
  // ---------------------------------------------------------------------------

  /** Build or refresh the TF-IDF corpus from the shop's transactions */
  private async ensureIndexed(shopId: string) {
    if (this.lastIndexedShop === shopId && this.store.size > 0) return;

    const transactions = await prisma.transaction.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { product: true, customer: true },
    });

    const docs: VectorDocument[] = transactions.map(t => ({
      id: t.id,
      text: [
        t.type,
        t.description,
        t.product?.name,
        t.customer?.name,
        t.amount,
        t.quantity,
        t.unit,
        t.paymentMethod,
      ].filter(Boolean).join(" "),
      metadata: {
        shopId: t.shopId,
        type: t.type,
        productName: t.product?.name,
        customerName: t.customer?.name,
        amount: t.amount,
        createdAt: t.createdAt.toISOString(),
      },
    }));

    this.store.load(docs);
    this.lastIndexedShop = shopId;
  }

  private buildQueryText(q: RAGQuery): string {
    return [q.intent, q.productName, q.customerName, q.amount?.toString()].filter(Boolean).join(" ");
  }

  private async getForecast(shopId: string, productName: string): Promise<ForecastResult | undefined> {
    const product = await prisma.product.findFirst({
      where: { shopId, name: { contains: productName } },
    });
    if (!product) return undefined;
    const history = await this.getSalesHistory(shopId, product.id);
    return forecaster.forecast(product.name, product.unit, product.currentStock, history);
  }

  private async getSalesHistory(shopId: string, productId: string): Promise<DailySalesPoint[]> {
    const txns = await prisma.transaction.findMany({
      where: { shopId, productId, type: { in: ["SALE", "CREDIT_SALE"] } },
      orderBy: { createdAt: "asc" },
    });

    const byDay = new Map<string, { quantity: number; revenue: number }>();
    for (const t of txns) {
      const day = t.createdAt.toISOString().split("T")[0];
      const existing = byDay.get(day) ?? { quantity: 0, revenue: 0 };
      byDay.set(day, { quantity: existing.quantity + (t.quantity ?? 0), revenue: existing.revenue + t.amount });
    }

    return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
  }

  private async getCustomerInsight(shopId: string, customerName: string): Promise<string | undefined> {
    const customer = await prisma.customer.findFirst({
      where: { shopId, name: { contains: customerName } },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!customer) return undefined;

    const creditCount = customer.transactions.filter(t => t.type === "CREDIT_SALE").length;
    const balance = customer.outstandingBalance;

    if (balance > 5000) return `⚠️ ${customer.name} has high outstanding balance ₹${balance}. Consider requesting payment.`;
    if (creditCount >= 3) return `${customer.name} has ${creditCount} recent credit purchases. Balance: ₹${balance}.`;
    if (balance === 0) return `${customer.name} has a clean balance — all paid up.`;
    return `${customer.name} owes ₹${balance}.`;
  }

  // G — Generate: compose a context-aware tip from retrieved data
  private generateTip(
    q: RAGQuery,
    forecast?: ForecastResult,
    customerInsight?: string,
    retrieved?: Array<{ document: { metadata: Record<string, unknown> }; score: number }>
  ): string | undefined {
    const tips: string[] = [];

    if (forecast) {
      if (forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 5) {
        tips.push(`⚠️ Stock alert: ${forecast.productName} will run out in ~${forecast.daysUntilStockout} days at current velocity.`);
      } else if (forecast.velocityTrend === "rising") {
        tips.push(`📈 ${forecast.productName} demand is rising — avg ${forecast.avg7Day} ${forecast.unit}/day this week.`);
      } else if (forecast.avg7Day > 0) {
        tips.push(`📊 ${forecast.productName}: ${forecast.avg7Day} ${forecast.unit}/day average, ₹${forecast.weeklyRevenue} weekly revenue.`);
      }
    }

    if (customerInsight) tips.push(customerInsight);

    return tips.length > 0 ? tips.join(" ") : undefined;
  }
}

export const shopRAG = new ShopRAGEngine();
