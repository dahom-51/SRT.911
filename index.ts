// ─── Products ────────────────────────────────────────────────────────────────

export type ProductCondition = "new" | "used" | "rare" | "refurbished";

export interface Product {
  id:            number;
  name:          string;
  nameAr:        string;
  description?:  string;
  descriptionAr?: string;
  price:         number;
  category:      string;
  condition:     ProductCondition;
  imageUrl?:     string;
  inStock:       boolean;
  isFeatured:    boolean;
  stockQuantity: number;
  createdAt:     string;
  updatedAt:     string;
}

export interface ProductList {
  products: Product[];
  total:    number;
  page:     number;
  limit:    number;
}

export interface ProductStats {
  totalProducts: number;
  inStock:       number;
  byCategory:    Array<{ category: string; count: number }>;
}

export interface Category {
  id:     string;
  name:   string;
  nameAr: string;
  count:  number;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled" | "refunded";

export type PaymentStatus  = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod  = "tap" | "card" | "cash_on_delivery";

export interface Customer {
  id:        number;
  name:      string;
  email:     string;
  phone:     string;
  address?:  string;
  city?:     string;
  country:   string;
  createdAt: string;
}

export interface OrderItem {
  id:         number;
  orderId:    number;
  productId:  number;
  quantity:   number;
  unitPrice:  number;
  totalPrice: number;
  product?:   Product;
}

export interface Payment {
  id:          number;
  orderId:     number;
  method:      PaymentMethod;
  status:      PaymentStatus;
  amount:      number;
  currency:    string;
  tapChargeId?: string;
  paidAt?:     string;
  createdAt:   string;
  updatedAt:   string;
}

export interface Order {
  id:              number;
  orderNumber:     string;
  customerId:      number;
  status:          OrderStatus;
  totalAmount:     number;
  currency:        string;
  notes?:          string;
  shippingAddress?: string;
  createdAt:       string;
  updatedAt:       string;
  customer?:       Customer;
  items?:          OrderItem[];
  payments?:       Payment[];
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  product:  Product;
  quantity: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  error:   string;
  code?:   string;
  details?: unknown;
}

export interface CreateOrderPayload {
  customer: {
    name:     string;
    email:    string;
    phone:    string;
    address?: string;
    city?:    string;
  };
  items:         Array<{ productId: number; quantity: number }>;
  notes?:        string;
  paymentMethod: PaymentMethod;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id:    number;
  email: string;
  name:  string;
}

export interface AuthState {
  token: string | null;
  admin: AdminUser | null;
}
