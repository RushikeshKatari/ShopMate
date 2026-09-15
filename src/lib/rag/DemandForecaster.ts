/**
 * ShopMate Demand Forecaster — Pure Local ML
 * Computes 7-day and 30-day moving averages, sales velocity,
 * predicted stock-out date, and demand trend per product.
 * Zero external dependencies. All arithmetic, no API.
 */

export interface DailySalesPoint {
  date: string; // YYYY-MM-DD
  quantity: number;
  revenue: number;
}

export interface ForecastResult {
  productName: string;
  unit: string;
  currentStock: number;
  avg7Day: number;           // avg daily quantity sold (7-day window)
  avg30Day: number;          // avg daily quantity sold (30-day window)
  velocityTrend: "rising" | "falling" | "stable";
  daysUntilStockout: number | null; // null = no data
  predictedReorderDate: string | null;
  weeklyRevenue: number;
  monthlyRevenue: number;
  demandScore: number;       // 0–100, normalised demand intensity
}

export class DemandForecaster {
  /**
   * Compute forecast for a single product given its daily sales history.
   */
  forecast(
    productName: string,
    unit: string,
    currentStock: number,
    history: DailySalesPoint[]
  ): ForecastResult {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const today = new Date();
    const days7 = this.filterDays(sorted, today, 7);
    const days30 = this.filterDays(sorted, today, 30);

    const avg7Day = days7.length > 0 ? this.avg(days7.map(d => d.quantity)) : 0;
    const avg30Day = days30.length > 0 ? this.avg(days30.map(d => d.quantity)) : 0;

    // Trend: compare first-half vs second-half of 30-day window
    const velocityTrend = this.computeTrend(days30);

    // Days until stockout using 7-day velocity (more recent = more accurate)
    let daysUntilStockout: number | null = null;
    let predictedReorderDate: string | null = null;
    if (avg7Day > 0 && currentStock > 0) {
      daysUntilStockout = Math.floor(currentStock / avg7Day);
      const reorderDate = new Date(today);
      reorderDate.setDate(reorderDate.getDate() + daysUntilStockout);
      predictedReorderDate = reorderDate.toISOString().split("T")[0];
    }

    const weeklyRevenue = this.sum(days7.map(d => d.revenue));
    const monthlyRevenue = this.sum(days30.map(d => d.revenue));

    // Demand score: normalise avg7Day to 0-100 scale (cap at 50 units/day = 100)
    const demandScore = Math.min(100, Math.round((avg7Day / 50) * 100));

    return {
      productName,
      unit,
      currentStock,
      avg7Day: Math.round(avg7Day * 100) / 100,
      avg30Day: Math.round(avg30Day * 100) / 100,
      velocityTrend,
      daysUntilStockout,
      predictedReorderDate,
      weeklyRevenue: Math.round(weeklyRevenue),
      monthlyRevenue: Math.round(monthlyRevenue),
      demandScore,
    };
  }

  /**
   * Batch forecast all products and return sorted by demand score descending.
   */
  forecastAll(
    products: Array<{ name: string; unit: string; currentStock: number; history: DailySalesPoint[] }>
  ): ForecastResult[] {
    return products
      .map(p => this.forecast(p.name, p.unit, p.currentStock, p.history))
      .sort((a, b) => b.demandScore - a.demandScore);
  }

  // ---------------------------------------------------------------------------
  private filterDays(sorted: DailySalesPoint[], from: Date, days: number): DailySalesPoint[] {
    const cutoff = new Date(from);
    cutoff.setDate(cutoff.getDate() - days);
    return sorted.filter(d => new Date(d.date) >= cutoff);
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  private sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  }

  private computeTrend(points: DailySalesPoint[]): "rising" | "falling" | "stable" {
    if (points.length < 4) return "stable";
    const half = Math.floor(points.length / 2);
    const firstHalf = this.avg(points.slice(0, half).map(d => d.quantity));
    const secondHalf = this.avg(points.slice(half).map(d => d.quantity));
    const delta = secondHalf - firstHalf;
    if (delta > firstHalf * 0.1) return "rising";
    if (delta < -firstHalf * 0.1) return "falling";
    return "stable";
  }
}
