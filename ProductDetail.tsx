import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsApi } from "@/lib/api";
import { useCart } from "@/lib/context";
import { formatPrice, CONDITION_LABELS, CATEGORY_LABELS } from "@/lib/utils";
import type { Product } from "@/types";
import toast from "react-hot-toast";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { id }  = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { add }  = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty,     setQty]     = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsApi.get(Number(id))
      .then(setProduct)
      .catch(() => navigate("/products", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAdd = () => {
    if (!product || !product.inStock) return;
    add(product, qty);
    toast.success(`تمت إضافة ${qty} للسلة`);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "3rem 1.25rem", display: "flex", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="product-detail page-enter">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="التنقل">
          <button className="breadcrumb__link" onClick={() => navigate("/")}>الرئيسية</button>
          <span className="breadcrumb__sep">›</span>
          <button className="breadcrumb__link" onClick={() => navigate("/products")}>المنتجات</button>
          <span className="breadcrumb__sep">›</span>
          <span className="breadcrumb__current">{product.nameAr || product.name}</span>
        </nav>

        <div className="product-detail__grid">
          {/* Image */}
          <div className="product-detail__img-wrap">
            {product.imageUrl
              ? <img src={product.imageUrl} alt={product.name} />
              : (
                <div className="product-detail__img-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 9h.01M15 15H9l3-3 2 2 1-1"/>
                  </svg>
                  <p>لا توجد صورة</p>
                </div>
              )
            }
          </div>

          {/* Info */}
          <div className="product-detail__info">
            <p className="product-detail__category">
              {CATEGORY_LABELS[product.category] ?? product.category}
            </p>
            <h1 className="product-detail__name">{product.nameAr || product.name}</h1>
            {product.name && product.nameAr && (
              <p className="product-detail__name-en">{product.name}</p>
            )}

            <div className="product-detail__badges">
              <span className="badge" style={{
                background: product.inStock ? "rgba(25,135,84,0.15)" : "rgba(220,53,69,0.15)",
                color:      product.inStock ? "#198754" : "#dc3545",
                border:     `1px solid ${product.inStock ? "rgba(25,135,84,0.3)" : "rgba(220,53,69,0.3)"}`,
              }}>
                {product.inStock ? `متوفر (${product.stockQuantity})` : "نفد من المخزون"}
              </span>
              <span className="badge" style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                {CONDITION_LABELS[product.condition]}
              </span>
            </div>

            <div className="product-detail__price">{formatPrice(product.price)}</div>

            {(product.descriptionAr || product.description) && (
              <div className="product-detail__desc">
                <h3>الوصف</h3>
                <p>{product.descriptionAr || product.description}</p>
              </div>
            )}

            {product.inStock && (
              <div className="product-detail__qty-row">
                <label className="label">الكمية</label>
                <div className="qty-control">
                  <button
                    className="qty-btn"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >−</button>
                  <span className="qty-value">{qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQty(q => Math.min(product.stockQuantity, q + 1))}
                    disabled={qty >= product.stockQuantity}
                  >+</button>
                </div>
              </div>
            )}

            <div className="product-detail__actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAdd}
                disabled={!product.inStock}
                style={{ flex: 1 }}
              >
                {product.inStock ? "أضف إلى السلة" : "نفد من المخزون"}
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => { handleAdd(); navigate("/cart"); }}
                disabled={!product.inStock}
              >
                اشترِ الآن
              </button>
            </div>

            {/* Meta */}
            <div className="product-detail__meta">
              <div className="product-detail__meta-row">
                <span>رقم المنتج</span>
                <span>#{product.id}</span>
              </div>
              <div className="product-detail__meta-row">
                <span>التصنيف</span>
                <span>{CATEGORY_LABELS[product.category] ?? product.category}</span>
              </div>
              <div className="product-detail__meta-row">
                <span>الحالة</span>
                <span>{CONDITION_LABELS[product.condition]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
