import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ordersApi, paymentsApi } from "@/lib/api";
import { useCart } from "@/lib/context";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import "./Checkout.css";

interface FormData {
  name:    string;
  email:   string;
  phone:   string;
  address: string;
  city:    string;
  notes:   string;
}

const EMPTY: FormData = { name: "", email: "", phone: "", address: "", city: "", notes: "" };

export default function Checkout() {
  const { items, totalPrice, clear } = useCart();
  const navigate = useNavigate();

  const [form,        setForm]        = useState<FormData>(EMPTY);
  const [payMethod,   setPayMethod]   = useState<"tap" | "cash_on_delivery">("tap");
  const [submitting,  setSubmitting]  = useState(false);

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("السلة فارغة"); return; }
    if (!form.name || !form.email || !form.phone) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create order
      const { order } = await ordersApi.create({
        customer:      { name: form.name, email: form.email, phone: form.phone, address: form.address, city: form.city },
        items:         items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        notes:         form.notes || undefined,
        paymentMethod: payMethod,
      });

      // 2. For Tap: redirect to payment page
      if (payMethod === "tap") {
        const redirectUrl = `${window.location.origin}/order-confirmation?orderId=${order.id}`;
        const { paymentUrl } = await paymentsApi.checkout(order.id, redirectUrl);
        clear();
        window.location.href = paymentUrl;
      } else {
        // Cash on delivery
        clear();
        navigate(`/order-confirmation?orderId=${order.id}&method=cod`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ، يرجى المحاولة مجدداً");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart", { replace: true });
    return null;
  }

  return (
    <div className="checkout-page page-enter">
      <div className="container">
        <h1 className="checkout-page__title">إتمام الشراء</h1>

        <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
          {/* ── Left: form ── */}
          <div className="checkout-form">
            {/* Customer info */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">بيانات العميل</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">الاسم الكامل *</label>
                  <input className="input" value={form.name} onChange={set("name")}
                    placeholder="محمد أحمد" required />
                </div>
                <div className="form-group">
                  <label className="label">رقم الجوال *</label>
                  <input className="input" value={form.phone} onChange={set("phone")}
                    placeholder="05xxxxxxxx" type="tel" required dir="ltr" />
                </div>
              </div>

              <div className="form-group">
                <label className="label">البريد الإلكتروني *</label>
                <input className="input" value={form.email} onChange={set("email")}
                  placeholder="example@email.com" type="email" required dir="ltr" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">المدينة</label>
                  <input className="input" value={form.city} onChange={set("city")}
                    placeholder="الرياض" />
                </div>
                <div className="form-group">
                  <label className="label">العنوان</label>
                  <input className="input" value={form.address} onChange={set("address")}
                    placeholder="الحي، الشارع" />
                </div>
              </div>

              <div className="form-group">
                <label className="label">ملاحظات (اختياري)</label>
                <textarea className="input" value={form.notes} onChange={set("notes")}
                  placeholder="أي تعليمات خاصة للطلب..." rows={3} />
              </div>
            </div>

            {/* Payment method */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">طريقة الدفع</h2>

              <div className="pay-methods">
                {([
                  { value: "tap",              label: "بطاقة / مدى / STC Pay", icon: "💳", desc: "دفع آمن عبر Tap Payments" },
                  { value: "cash_on_delivery", label: "الدفع عند الاستلام",     icon: "💵", desc: "ادفع نقداً عند وصول الطلب" },
                ] as const).map(m => (
                  <label key={m.value} className={`pay-method ${payMethod === m.value ? "pay-method--active" : ""}`}>
                    <input type="radio" name="payMethod" value={m.value}
                      checked={payMethod === m.value}
                      onChange={() => setPayMethod(m.value)} />
                    <span className="pay-method__icon">{m.icon}</span>
                    <div className="pay-method__text">
                      <span className="pay-method__label">{m.label}</span>
                      <span className="pay-method__desc">{m.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: order summary ── */}
          <div className="checkout-summary">
            <h2 className="checkout-section__title">ملخص الطلب</h2>

            <div className="checkout-summary__items">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="checkout-summary__item">
                  <div className="checkout-summary__item-img">
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} />
                      : <span>📦</span>
                    }
                    <span className="checkout-summary__item-qty">{quantity}</span>
                  </div>
                  <div className="checkout-summary__item-info">
                    <p>{product.nameAr || product.name}</p>
                    <p className="checkout-summary__item-price">
                      {formatPrice(product.price * quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="checkout-summary__totals">
              <div className="checkout-summary__row">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="checkout-summary__row">
                <span>الشحن</span>
                <span className="text-success">مجاني</span>
              </div>
            </div>

            <div className="checkout-summary__total">
              <span>الإجمالي</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "1.25rem" }}
              disabled={submitting}
            >
              {submitting
                ? "جاري المعالجة..."
                : payMethod === "tap"
                  ? `ادفع ${formatPrice(totalPrice)}`
                  : "تأكيد الطلب"
              }
            </button>

            <p className="checkout-summary__secure">
              🔒 دفع آمن ومشفر بالكامل
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
