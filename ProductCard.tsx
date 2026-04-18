import { useCart } from "@/lib/context";
import { formatPrice, CONDITION_LABELS, CATEGORY_LABELS } from "@/lib/utils";
import type { Product } from "@/types";
import toast from "react-hot-toast";
import "./ProductCard.css";

interface Props {
  product: Product;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: Props) {
  const { add } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;
    add(product, 1);
    toast.success("تمت الإضافة إلى السلة");
  };

  return (
    <div className="product-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}>

      {/* Image */}
      <div className="product-card__img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} loading="lazy" />
          : (
            <div className="product-card__img-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 9h.01M15 15H9l3-3 2 2 1-1"/>
              </svg>
            </div>
          )
        }

        {/* Badges */}
        <div className="product-card__badges">
          {product.isFeatured && (
            <span className="badge" style={{ background: "var(--accent)", color: "#0d0d0d" }}>مميز</span>
          )}
          {!product.inStock && (
            <span className="badge" style={{ background: "var(--danger)", color: "#fff" }}>نفد</span>
          )}
          <span className="badge product-card__condition-badge">
            {CONDITION_LABELS[product.condition]}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="product-card__body">
        <p className="product-card__category">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        <h3 className="product-card__name">{product.nameAr || product.name}</h3>
        {product.descriptionAr && (
          <p className="product-card__desc">{product.descriptionAr}</p>
        )}

        <div className="product-card__footer">
          <span className="product-card__price">{formatPrice(product.price)}</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={!product.inStock}
          >
            {product.inStock ? "أضف للسلة" : "نفد"}
          </button>
        </div>
      </div>
    </div>
  );
}
