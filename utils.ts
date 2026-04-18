import type { OrderStatus, PaymentStatus, ProductCondition } from "@/types";

export function formatPrice(amount: number, currency = "SAR"): string {
  return new Intl.NumberFormat("ar-SA", {
    style:    "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  }).format(new Date(iso));
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, { ar: string; color: string }> = {
  pending:    { ar: "قيد الانتظار",  color: "#f59e0b" },
  confirmed:  { ar: "مؤكد",          color: "#3b82f6" },
  processing: { ar: "قيد التجهيز",   color: "#8b5cf6" },
  shipped:    { ar: "تم الشحن",       color: "#06b6d4" },
  delivered:  { ar: "تم التسليم",     color: "#10b981" },
  cancelled:  { ar: "ملغى",           color: "#ef4444" },
  refunded:   { ar: "مسترجع",         color: "#6b7280" },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { ar: string; color: string }> = {
  pending:  { ar: "في الانتظار", color: "#f59e0b" },
  paid:     { ar: "مدفوع",       color: "#10b981" },
  failed:   { ar: "فشل",         color: "#ef4444" },
  refunded: { ar: "مسترجع",      color: "#6b7280" },
};

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new:         "جديد",
  used:        "مستعمل",
  rare:        "نادر",
  refurbished: "مجدد",
};

export const CATEGORY_LABELS: Record<string, string> = {
  "ford-parts":          "قطع فورد",
  "police-collectibles": "نوادر بوليسية",
};
