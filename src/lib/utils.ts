import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard utility for conditionally combining Tailwind CSS class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper locale symbol.
 * Default currency is INR (₹) or specified code.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = "INR",
  minimumFractionDigits = 2
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits: minimumFractionDigits,
    }).format(amount);
  } catch {
    // Fallback if currency code is unusual
    return `${currency} ${amount.toFixed(minimumFractionDigits)}`;
  }
}

/**
 * Format integer numbers with standard comma separators
 */
export function formatNumber(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "bigint" ? Number(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN").format(num);
}

/**
 * Format percentage with specified decimals
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format ROAS value cleanly (e.g. 2.45x)
 */
export function formatROAS(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)}x`;
}

/**
 * Format ISO date string into readable standard string
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format timestamp with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
