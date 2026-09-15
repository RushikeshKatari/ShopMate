import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number according to the Indian numbering system (e.g. ₹8,450 or ₹1,25,000)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

/**
 * Formats date/time for transactions and logs (e.g. "14 Sep 2026, 10:30 AM")
 */
export function formatDateTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Standard units supported in Indian retail
 */
export const SUPPORTED_UNITS = [
  "kg",
  "g",
  "litre",
  "ml",
  "piece",
  "packet",
  "box",
  "dozen",
] as const;

export type SupportedUnit = (typeof SUPPORTED_UNITS)[number];

export function getUnitDisplay(unit: string | null | undefined): string {
  if (!unit) return "";
  if (unit === "litre") return "L";
  return unit;
}
