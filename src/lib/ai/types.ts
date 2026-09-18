import { z } from "zod";

export const SUPPORTED_INTENTS = [
  "record_purchase",
  "record_sale",
  "record_credit_sale",
  "record_payment",
  "get_product_price",
  "set_product_price",
  "set_profit_margin",
  "set_minimum_stock",
  "get_stock",
  "get_customer_balance",
  "get_daily_sales",
  "get_profit_summary",
  "get_low_stock",
  "get_out_of_stock",
  "list_products",
  "get_khata_summary",
  "get_transaction_history",
  "create_customer",
  "create_product",
  "update_stock",
  "greeting",
  "help",
  "business_overview",
  "confirm_action",
  "cancel_action",
  "unknown",
] as const;

export type SupportedIntent = (typeof SUPPORTED_INTENTS)[number];

// Structured Command Result
export interface AICommandResult {
  intent: SupportedIntent;
  confidence: number;
  entities: Record<string, any>;
  requires_confirmation: boolean;
  confirmation_message?: string;
  clarification_question?: string;
  speech_response?: string;
  speech_response_telugu?: string;
  is_telugu?: boolean;
  raw_response?: string;
}

// Validation schemas for intents
export const RecordPurchaseSchema = z.object({
  product_name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default("kg"),
  total_amount: z.number().positive(),
  purchase_price_per_unit: z.number().optional(),
});

export const RecordSaleSchema = z.object({
  product_name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default("kg"),
  total_amount: z.number().positive().optional(),
  payment_method: z.enum(["CASH", "UPI", "OTHER"]).default("CASH"),
});

export const RecordCreditSaleSchema = z.object({
  customer_name: z.string().min(1),
  product_name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default("kg"),
  total_amount: z.number().positive().optional(),
});

export const RecordPaymentSchema = z.object({
  customer_name: z.string().min(1),
  amount: z.number().positive(),
  payment_method: z.enum(["CASH", "UPI", "OTHER"]).default("CASH"),
});

export const SetProductPriceSchema = z.object({
  product_name: z.string().min(1),
  price: z.number().positive(),
});

export const SetProfitMarginSchema = z.object({
  product_name: z.string().min(1),
  profit_amount: z.number().positive(),
});

export const SetMinimumStockSchema = z.object({
  product_name: z.string().min(1),
  minimum_stock: z.number().nonnegative(),
});

export const GetProductPriceSchema = z.object({
  product_name: z.string().min(1),
});

export const GetStockSchema = z.object({
  product_name: z.string().min(1),
});

export const GetCustomerBalanceSchema = z.object({
  customer_name: z.string().min(1),
});

export interface AIContext {
  shopName: string;
  currency: string;
  language?: string;
  products: Array<{
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    purchasePrice: number;
    sellingPrice: number;
    minimumStock: number;
  }>;
  customers: Array<{
    id: string;
    name: string;
    outstandingBalance: number;
    phone?: string | null;
  }>;
  conversationState?: {
    pendingIntent?: string;
    pendingEntities?: Record<string, any>;
    missingSlot?: string;
  } | null;
}
