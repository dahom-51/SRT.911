import { useNavigate } from "react-router-dom";
import { useCart } from "@/lib/context";
import { formatPrice } from "@/lib/utils";
import "./Cart.css";

export default function Cart() {
  const { items, totalPrice, totalItems, remove, update, clear } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="cart-page page-enter">
        <div className="container">
          <h1 className="cart-page__title">عربة التسوق</h1>
          <div className="empty-state">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p>السلة فارغة</p>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }}
              onClick={() => navigate("/products")}>
              تصفح المنتجات
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page page-enter">
      <div className="container">
        <div className="cart-page__header">
          <h1 className="cart-page__title">
            عربة التسوق
            <span className="cart-page__count">({totalItems} منتج)</span>
          </h1>
          <button className="btn btn-ghost btn-sm" onClick={clear}>
            مسح الكل
          </button>
        </div>

        <div className="cart-page__layout">
          {/* Items */}
          <div className="cart-items">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="cart-item">
                {/* Image */}
                <div className="cart-item__img">
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} />
                    : <div className="cart-item__img-placeholder">📦</div>
                  }
                </div>

                {/* Info */}
                <div className="cart-item__info">
                  <p className="cart-item__name">{product.nameAr || product.name}</p>
                  <p className="cart-item__unit-price">{formatPrice(product.price)} / قطعة</p>
                </div>

                {/* Qty */}
                <div className="cart-item__qty">
                  <button className="qty-btn"
                    onClick={() => update(product.id, quantity - 1)}
                    disabled={quantity <= 1}>−</button>
                  <span className="qty-value">{quantity}</span>
                  <button className="qty-btn"
                    onClick={() => update(product.id, quantity + 1)}
                    disabled={quantity >= product.stockQuantity}>+</button>
                </div>

                {/* Total */}
                <div className="cart-item__total">
                  {formatPrice(product.price * quantity)}
                </div>

                {/* Remove */}
                <button className="cart-item__remove" onClick={() => remove(product.id)}
                  aria-label="حذف">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="cart-summary">
            <h2 className="cart-summary__title">ملخص الطلب</h2>

            <div className="cart-summary__rows">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="cart-summary__row">
                  <span>{product.nameAr || product.name} × {quantity}</span>
                  <span>{formatPrice(product.price * quantity)}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="cart-summary__total">
              <span>الإجمالي</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <p className="cart-summary__note">الأسعار شاملة لضريبة القيمة المضافة</p>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={() => navigate("/checkout")}
            >
              إتمام الشراء
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: "100%", marginTop: "0.5rem" }}
              onClick={() => navigate("/products")}
            >
              مواصلة التسوق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
