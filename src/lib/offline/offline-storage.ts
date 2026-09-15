"use client";

export interface SyncQueueItem {
  id: string;
  type: "SALE" | "PURCHASE" | "CREDIT_SALE" | "PAYMENT";
  payload: any;
  createdAt: string;
}

const STORAGE_KEYS = {
  PRODUCTS: "shopmate_cached_products",
  CUSTOMERS: "shopmate_cached_customers",
  TRANSACTIONS: "shopmate_cached_transactions",
  SYNC_QUEUE: "shopmate_sync_queue",
};

export class OfflineStorage {
  static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  static getSyncQueue(): SyncQueueItem[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addToSyncQueue(type: SyncQueueItem["type"], payload: any): SyncQueueItem {
    const queue = this.getSyncQueue();
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
    };
    queue.push(item);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
    return item;
  }

  static clearSyncQueue(idsToRemove?: string[]) {
    if (!this.isBrowser()) return;
    if (!idsToRemove || idsToRemove.length === 0) {
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      return;
    }
    const current = this.getSyncQueue();
    const filtered = current.filter((item) => !idsToRemove.includes(item.id));
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
  }

  static cacheData(key: "PRODUCTS" | "CUSTOMERS" | "TRANSACTIONS", data: any) {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    } catch (e) {
      console.warn("Local storage write error:", e);
    }
  }

  static getCachedData(key: "PRODUCTS" | "CUSTOMERS" | "TRANSACTIONS"): any | null {
    if (!this.isBrowser()) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS[key]);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async syncWithServer(): Promise<{ synced: number; failed: number }> {
    const queue = this.getSyncQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue }),
      });

      if (res.ok) {
        const data = await res.json();
        const successfulIds = (data.results || [])
          .filter((r: any) => r.status === "SUCCESS")
          .map((r: any) => r.id);

        this.clearSyncQueue(successfulIds);
        return {
          synced: successfulIds.length,
          failed: queue.length - successfulIds.length,
        };
      }
    } catch (err) {
      console.warn("Offline sync attempt failed:", err);
    }

    return { synced: 0, failed: queue.length };
  }
}
