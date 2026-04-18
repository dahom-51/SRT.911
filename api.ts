import type {
  Product, ProductList, ProductStats, Category,
  Order, CreateOrderPayload,
  AdminUser,
} from "@/types";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path:    string,
  options: RequestInit = {},
  token?:  string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: AdminUser }>("/auth/login", {
      method: "POST",
      body:   JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    request<AdminUser>("/auth/me", {}, token),

  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body:   JSON.stringify({ currentPassword, newPassword }),
    }, token),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.search)   q.set("search",   params.search);
    if (params?.page)     q.set("page",     String(params.page));
    if (params?.limit)    q.set("limit",    String(params.limit));
    return request<ProductList>(`/products?${q.toString()}`);
  },

  featured: ()        => request<Product[]>("/products/featured"),
  get:      (id: number) => request<Product>(`/products/${id}`),
  stats:    (token: string) => request<ProductStats>("/products/stats", {}, token),

  create: (data: Partial<Product>, token: string) =>
    request<Product>("/products", {
      method: "POST",
      body:   JSON.stringify(data),
    }, token),

  update: (id: number, data: Partial<Product>, token: string) =>
    request<Product>(`/products/${id}`, {
      method: "PUT",
      body:   JSON.stringify(data),
    }, token),

  delete: (id: number, token: string) =>
    request<void>(`/products/${id}`, { method: "DELETE" }, token),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => request<Category[]>("/categories"),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    request<{ order: Order; payment: { id: number } }>("/orders", {
      method: "POST",
      body:   JSON.stringify(payload),
    }),

  list: (token: string) =>
    request<Order[]>("/orders", {}, token),

  get: (id: number, token: string) =>
    request<Order>(`/orders/${id}`, {}, token),

  updateStatus: (id: number, status: string, token: string) =>
    request<Order>(`/orders/${id}/status`, {
      method: "PATCH",
      body:   JSON.stringify({ status }),
    }, token),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsApi = {
  checkout: (orderId: number, redirectUrl: string) =>
    request<{ chargeId: string; paymentUrl: string }>("/payments/checkout", {
      method: "POST",
      body:   JSON.stringify({ orderId, redirectUrl }),
    }),

  status: (orderId: number) =>
    request<{ orderId: number; status: string; amount: number; paidAt?: string }>(
      `/payments/status/${orderId}`
    ),

  list: (token: string) =>
    request<Array<{ id: number; status: string; amount: number; order?: Order }>>("/payments", {}, token),
};
