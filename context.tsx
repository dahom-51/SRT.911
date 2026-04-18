import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import type { CartItem, Product, AuthState, AdminUser } from "@/types";

// ─── Cart Context ─────────────────────────────────────────────────────────────

type CartAction =
  | { type: "ADD";    product: Product; quantity?: number }
  | { type: "REMOVE"; productId: number }
  | { type: "UPDATE"; productId: number; quantity: number }
  | { type: "CLEAR" };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD": {
      const qty = action.quantity ?? 1;
      const existing = state.find(i => i.product.id === action.product.id);
      if (existing) {
        return state.map(i =>
          i.product.id === action.product.id
            ? { ...i, quantity: Math.min(i.quantity + qty, i.product.stockQuantity) }
            : i
        );
      }
      return [...state, { product: action.product, quantity: qty }];
    }
    case "REMOVE":
      return state.filter(i => i.product.id !== action.productId);
    case "UPDATE":
      return state.map(i =>
        i.product.id === action.productId
          ? { ...i, quantity: Math.max(1, Math.min(action.quantity, i.product.stockQuantity)) }
          : i
      );
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

interface CartContextValue {
  items:       CartItem[];
  totalItems:  number;
  totalPrice:  number;
  add:         (product: Product, quantity?: number) => void;
  remove:      (productId: number) => void;
  update:      (productId: number, quantity: number) => void;
  clear:       () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, [], () => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, totalItems, totalPrice,
      add:    (p, q)    => dispatch({ type: "ADD",    product: p, quantity: q }),
      remove: (id)      => dispatch({ type: "REMOVE", productId: id }),
      update: (id, qty) => dispatch({ type: "UPDATE", productId: id, quantity: qty }),
      clear:  ()        => dispatch({ type: "CLEAR" }),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  token:   string | null;
  admin:   AdminUser | null;
  login:   (token: string, admin: AdminUser) => void;
  logout:  () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useReducer(
    (_: AuthState, next: AuthState) => next,
    { token: null, admin: null } as AuthState,
    () => {
      try {
        const token = localStorage.getItem("admin_token");
        const admin = localStorage.getItem("admin_user");
        return {
          token: token,
          admin: admin ? (JSON.parse(admin) as AdminUser) : null,
        };
      } catch { return { token: null, admin: null }; }
    }
  );

  const login = (token: string, admin: AdminUser) => {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify(admin));
    setState({ token, admin });
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setState({ token: null, admin: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
