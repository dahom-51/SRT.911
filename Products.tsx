import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { productsApi, categoriesApi } from "@/lib/api";
import type { Product, Category } from "@/types";
import ProductCard from "@/components/shop/ProductCard";
import "./Products.css";

const LIMIT = 12;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);

  const page     = Number(searchParams.get("page")     ?? 1);
  const category = searchParams.get("category") ?? "";
  const search   = searchParams.get("search")   ?? "";

  const fetchProducts = useCallback(() => {
    setLoading(true);
    productsApi
      .list({ category: category || undefined, search: search || undefined, page, limit: LIMIT })
      .then(data => { setProducts(data.products); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error);
  }, []);

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="products-page page-enter">
      <div className="container">
        {/* ── Header ── */}
        <div className="products-page__header">
          <h1 className="products-page__title">المنتجات</h1>
          <p className="products-page__count">
            {total > 0 ? `${total} منتج` : ""}
          </p>
        </div>

        <div className="products-page__layout">
          {/* ── Sidebar filters ── */}
          <aside className="products-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-section__title">البحث</h3>
              <input
                className="input"
                type="search"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={e => setParam("search", e.target.value)}
              />
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-section__title">التصنيف</h3>
              <div className="sidebar-filters">
                <button
                  className={`filter-btn ${!category ? "filter-btn--active" : ""}`}
                  onClick={() => setParam("category", "")}
                >
                  الكل
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    className={`filter-btn ${category === c.id ? "filter-btn--active" : ""}`}
                    onClick={() => setParam("category", c.id)}
                  >
                    {c.nameAr}
                    <span className="filter-btn__count">{c.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Grid ── */}
          <div className="products-page__content">
            {/* Active filters pill */}
            {(category || search) && (
              <div className="active-filters">
                {category && (
                  <span className="active-filter">
                    {categories.find(c => c.id === category)?.nameAr ?? category}
                    <button onClick={() => setParam("category", "")}>✕</button>
                  </span>
                )}
                {search && (
                  <span className="active-filter">
                    "{search}"
                    <button onClick={() => setParam("search", "")}>✕</button>
                  </span>
                )}
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setSearchParams({})}>
                  مسح الكل
                </button>
              </div>
            )}

            {loading ? (
              <div className="products-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <p>لا توجد منتجات مطابقة</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: "1rem" }}
                  onClick={() => setSearchParams({})}>
                  عرض كل المنتجات
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => navigate(`/products/${p.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setParam("page", String(page - 1))}
                >
                  ← السابق
                </button>
                <span className="pagination__info">
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setParam("page", String(page + 1))}
                >
                  التالي →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
