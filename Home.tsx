import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi, categoriesApi } from "@/lib/api";
import type { Product, Category } from "@/types";
import ProductCard from "@/components/shop/ProductCard";
import "./Home.css";

export default function Home() {
  const [featured,   setFeatured]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([productsApi.featured(), categoriesApi.list()])
      .then(([f, c]) => { setFeatured(f); setCategories(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home page-enter">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__bg" aria-hidden="true">
          <div className="hero__grid" />
          <div className="hero__glow" />
        </div>
        <div className="container hero__content">
          <div className="hero__eyebrow">متجر القطع النادرة</div>
          <h1 className="hero__title">
            قطع فورد<br />
            <em>ونوادر بوليسية</em>
          </h1>
          <p className="hero__subtitle">
            أصيلة · نادرة · مجمّعة بعناية من أربعة عقود
          </p>
          <div className="hero__actions">
            <button className="btn btn-primary btn-lg"
              onClick={() => navigate("/products")}>
              تصفح المنتجات
            </button>
            <button className="btn btn-outline btn-lg"
              onClick={() => navigate("/products?category=police-collectibles")}>
              النوادر البوليسية
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hero__stats">
          <div className="container hero__stats-inner">
            {[
              { label: "منتج نادر",      value: "٥٠٠+" },
              { label: "سنة خبرة",       value: "٤٠"   },
              { label: "عميل راضٍ",      value: "٢٠٠+" },
              { label: "ضمان الأصالة",   value: "١٠٠%" },
            ].map(s => (
              <div key={s.label} className="hero__stat">
                <span className="hero__stat-value">{s.value}</span>
                <span className="hero__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <h2 className="section__title">التصنيفات</h2>
          <div className="categories-grid">
            {categories.map(cat => (
              <button
                key={cat.id}
                className="category-card"
                onClick={() => navigate(`/products?category=${cat.id}`)}
              >
                <span className="category-card__icon">
                  {cat.id === "ford-parts" ? "🔧" : "⭐"}
                </span>
                <span className="category-card__name">{cat.nameAr}</span>
                <span className="category-card__count">{cat.count} منتج</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">منتجات مميزة</h2>
            <button className="btn btn-ghost" onClick={() => navigate("/products")}>
              عرض الكل ←
            </button>
          </div>

          {loading ? (
            <div className="loading-row">
              {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : featured.length === 0 ? (
            <div className="empty-state"><p>لا توجد منتجات مميزة حالياً</p></div>
          ) : (
            <div className="products-grid">
              {featured.map(p => (
                <ProductCard key={p.id} product={p}
                  onClick={() => navigate(`/products/${p.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Trust section ────────────────────────────────────────────── */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            {[
              { icon: "🔐", title: "دفع آمن",         desc: "عبر Tap Payments الموثوق" },
              { icon: "✅", title: "ضمان الأصالة",    desc: "كل قطعة موثقة ومعتمدة"    },
              { icon: "📦", title: "شحن سريع",        desc: "لجميع مناطق المملكة"       },
              { icon: "↩️", title: "إرجاع مضمون",    desc: "خلال ٧ أيام من الاستلام"   },
            ].map(t => (
              <div key={t.title} className="trust-item">
                <span className="trust-item__icon">{t.icon}</span>
                <div>
                  <h4 className="trust-item__title">{t.title}</h4>
                  <p className="trust-item__desc">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
