import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { CartProvider, AuthProvider, useAuth } from "@/lib/context";
import Navbar from "@/components/layout/Navbar";
import Home               from "@/pages/Home";
import Products           from "@/pages/Products";
import ProductDetail      from "@/pages/ProductDetail";
import Cart               from "@/pages/Cart";
import Checkout           from "@/pages/Checkout";
import OrderConfirmation  from "@/pages/OrderConfirmation";
import AdminLogin         from "@/pages/AdminLogin";
import AdminDashboard     from "@/pages/AdminDashboard";

// Admin guard
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/admin" replace />;
}

// Shop layout (with Navbar)
function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} متجر النادرة — قطع فورد ونوادر بوليسية</p>
        </div>
      </footer>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Shop */}
      <Route path="/" element={
        <ShopLayout><Home /></ShopLayout>
      }/>
      <Route path="/products" element={
        <ShopLayout><Products /></ShopLayout>
      }/>
      <Route path="/products/:id" element={
        <ShopLayout><ProductDetail /></ShopLayout>
      }/>
      <Route path="/cart" element={
        <ShopLayout><Cart /></ShopLayout>
      }/>
      <Route path="/checkout" element={
        <ShopLayout><Checkout /></ShopLayout>
      }/>
      <Route path="/order-confirmation" element={
        <ShopLayout><OrderConfirmation /></ShopLayout>
      }/>

      {/* Admin */}
      <Route path="/admin"           element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={
        <AdminRoute><AdminDashboard /></AdminRoute>
      }/>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background:  "#1e1e1e",
                color:       "#e8e8e0",
                border:      "1px solid #2e2e2e",
                borderRadius: "6px",
                fontFamily:  "'Cairo', sans-serif",
                direction:   "rtl",
              },
              success: { iconTheme: { primary: "#c8a84b", secondary: "#0d0d0d" } },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
