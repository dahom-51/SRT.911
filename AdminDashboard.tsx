import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi, ordersApi, paymentsApi } from "@/lib/api";
import { useAuth } from "@/lib/context";
import { formatPrice, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import type { Product, Order, ProductStats } from "@/types";
import toast from "react-hot-toast";
import "./AdminDashboard.css";

type Tab = "overview" | "products" | "orders";

const EMPTY_PRODUCT = {
  name: "", nameAr: "", description: "", descriptionAr: "",
  price: 0, category: "ford-parts", condition: "used" as const,
  imageUrl: "", inStock: true, isFeatured: false, stockQuantity: 1,
};

export default function AdminDashboard() {
  const { token, admin, logout } = useAuth();
  const navigate = useNavigate();

  const [tab,        setTab]        = useState<Tab>("overview");
  const [stats,      setStats]      = useState<ProductStats | null>(null);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(false);

  // Product form
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<number | null>(null);
  const [formData,   setFormData]   = useState(EMPTY_PRODUCT);
  const [saving,     setSaving]     = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) navigate("/admin", { replace: true });
  }, [token, navigate]);

  const loadStats = useCallback(() => {
    if (!token) return;
    productsApi.stats(token).then(setStats).catch(console.error);
  }, [token]);

  const loadProducts = useCallback(() => {
    if (!token) return;
    setLoading(true);
    productsApi.list({ limit: 100 })
      .then(d => setProducts(d.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const loadOrders = useCallback(() => {
    if (!token) return;
    setLoading(true);
    ordersApi.list(token)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (tab === "products") loadProducts();
    if (tab === "orders")   loadOrders();
  }, [tab, loadProducts, loadOrders]);

  // ── Product form handlers ─────────────────────────────────────────────────

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_PRODUCT);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setFormData({
      name: p.name, nameAr: p.nameAr,
      description: p.description ?? "", descriptionAr: p.descriptionAr ?? "",
      price: p.price, category: p.category,
      condition: p.condition as typeof EMPTY_PRODUCT.condition,
      imageUrl: p.imageUrl ?? "", inStock: p.inStock,
      isFeatured: p.isFeatured, stockQuantity: p.stockQuantity,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.nameAr || !formData.price) {
      toast.error("الاسم بالعربي والسعر مطلوبان");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await productsApi.update(editId, formData, token);
        toast.success("تم تحديث المنتج");
      } else {
        await productsApi.create(formData, token);
        toast.success("تم إضافة المنتج");
      }
      setShowForm(false);
      loadProducts();
      loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!token) return;
    if (!window.confirm(`حذف "${name}"؟`)) return;
    try {
      await productsApi.delete(id, token);
      toast.success("تم الحذف");
      loadProducts();
      loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    }
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    if (!token) return;
    try {
      await ordersApi.updateStatus(orderId, status, token);
      toast.success("تم تحديث حالة الطلب");
      loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    }
  };

  const setField = (key: string, val: unknown) =>
    setFormData(f => ({ ...f, [key]: val }));

  return (
    <div className="admin-dash">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <span>⚿</span> لوحة التحكم
        </div>
        <nav className="admin-sidebar__nav">
          {(["overview", "products", "orders"] as Tab[]).map(t => (
            <button key={t} className={`admin-nav-btn ${tab === t ? "admin-nav-btn--active" : ""}`}
              onClick={() => setTab(t)}>
              {{ overview: "📊 نظرة عامة", products: "📦 المنتجات", orders: "🛒 الطلبات" }[t]}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <p className="admin-sidebar__user">{admin?.name}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate("/admin"); }}>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">

        {/* ── Overview tab ── */}
        {tab === "overview" && (
          <div className="page-enter">
            <h1 className="admin-page-title">نظرة عامة</h1>
            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <p className="stat-card__label">إجمالي المنتجات</p>
                  <p className="stat-card__value">{stats.totalProducts}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card__label">متوفر في المخزن</p>
                  <p className="stat-card__value">{stats.inStock}</p>
                </div>
                {stats.byCategory.map(c => (
                  <div key={c.category} className="stat-card">
                    <p className="stat-card__label">{c.category === "ford-parts" ? "قطع فورد" : "نوادر بوليسية"}</p>
                    <p className="stat-card__value">{c.count}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="admin-quick-links">
              <button className="btn btn-primary" onClick={() => { setTab("products"); openCreate(); }}>
                + إضافة منتج جديد
              </button>
              <button className="btn btn-outline" onClick={() => setTab("orders")}>
                عرض الطلبات
              </button>
            </div>
          </div>
        )}

        {/* ── Products tab ── */}
        {tab === "products" && (
          <div className="page-enter">
            <div className="admin-tab-header">
              <h1 className="admin-page-title">المنتجات</h1>
              <button className="btn btn-primary" onClick={openCreate}>+ إضافة منتج</button>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <div className="spinner" />
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المنتج</th>
                      <th>التصنيف</th>
                      <th>السعر</th>
                      <th>المخزون</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td style={{ color: "var(--text3)" }}>{p.id}</td>
                        <td>
                          <div className="admin-product-cell">
                            {p.imageUrl && (
                              <img src={p.imageUrl} alt={p.name}
                                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                            )}
                            <div>
                              <p style={{ fontWeight: 600 }}>{p.nameAr}</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--text2)" }}>{p.name}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
                          {p.category === "ford-parts" ? "قطع فورد" : "نوادر"}
                        </td>
                        <td style={{ color: "var(--accent)", fontWeight: 700 }}>
                          {formatPrice(p.price)}
                        </td>
                        <td>{p.stockQuantity}</td>
                        <td>
                          <span className="badge" style={{
                            background: p.inStock ? "rgba(25,135,84,0.15)" : "rgba(220,53,69,0.15)",
                            color:      p.inStock ? "var(--success)"        : "var(--danger)",
                          }}>
                            {p.inStock ? "متوفر" : "نفد"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>
                              تعديل
                            </button>
                            <button className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(p.id, p.nameAr)}>
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Orders tab ── */}
        {tab === "orders" && (
          <div className="page-enter">
            <h1 className="admin-page-title">الطلبات ({orders.length})</h1>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <div className="spinner" />
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-state"><p>لا توجد طلبات بعد</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>العميل</th>
                      <th>الإجمالي</th>
                      <th>الحالة</th>
                      <th>تاريخ</th>
                      <th>تغيير الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => {
                      const statusInfo = ORDER_STATUS_LABELS[o.status];
                      return (
                        <tr key={o.id}>
                          <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                            {o.orderNumber}
                          </td>
                          <td>
                            <p style={{ fontWeight: 600 }}>{o.customer?.name ?? "—"}</p>
                            <p style={{ fontSize: "0.75rem", color: "var(--text2)" }}>
                              {o.customer?.phone}
                            </p>
                          </td>
                          <td style={{ color: "var(--accent)", fontWeight: 700 }}>
                            {formatPrice(o.totalAmount)}
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: `${statusInfo.color}22`,
                              color:      statusInfo.color,
                              border:     `1px solid ${statusInfo.color}44`,
                            }}>
                              {statusInfo.ar}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                            {formatDate(o.createdAt)}
                          </td>
                          <td>
                            <select
                              className="input"
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
                              value={o.status}
                              onChange={e => handleStatusChange(o.id, e.target.value)}
                            >
                              {Object.entries(ORDER_STATUS_LABELS).map(([val, { ar }]) => (
                                <option key={val} value={val}>{ar}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Product form modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editId ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
              <button className="modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="form-row">
                <div className="form-group">
                  <label className="label">الاسم بالعربي *</label>
                  <input className="input" value={formData.nameAr}
                    onChange={e => setField("nameAr", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">الاسم بالإنجليزي</label>
                  <input className="input" value={formData.name} dir="ltr"
                    onChange={e => setField("name", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">السعر (ريال) *</label>
                  <input className="input" type="number" min={0} value={formData.price}
                    onChange={e => setField("price", Number(e.target.value))} dir="ltr" />
                </div>
                <div className="form-group">
                  <label className="label">الكمية</label>
                  <input className="input" type="number" min={0} value={formData.stockQuantity}
                    onChange={e => setField("stockQuantity", Number(e.target.value))} dir="ltr" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">التصنيف</label>
                  <select className="input" value={formData.category}
                    onChange={e => setField("category", e.target.value)}>
                    <option value="ford-parts">قطع فورد</option>
                    <option value="police-collectibles">نوادر بوليسية</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">الحالة</label>
                  <select className="input" value={formData.condition}
                    onChange={e => setField("condition", e.target.value)}>
                    <option value="new">جديد</option>
                    <option value="used">مستعمل</option>
                    <option value="rare">نادر</option>
                    <option value="refurbished">مجدد</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">رابط الصورة</label>
                <input className="input" value={formData.imageUrl} dir="ltr"
                  placeholder="https://..." onChange={e => setField("imageUrl", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">الوصف بالعربي</label>
                <textarea className="input" rows={3} value={formData.descriptionAr}
                  onChange={e => setField("descriptionAr", e.target.value)} />
              </div>
              <div className="form-row" style={{ gap: "1.5rem" }}>
                <label className="admin-checkbox">
                  <input type="checkbox" checked={formData.inStock}
                    onChange={e => setField("inStock", e.target.checked)} />
                  متوفر في المخزون
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" checked={formData.isFeatured}
                    onChange={e => setField("isFeatured", e.target.checked)} />
                  منتج مميز
                </label>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : editId ? "حفظ التعديلات" : "إضافة المنتج"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
