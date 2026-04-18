import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/lib/context";
import "./Navbar.css";

export default function Navbar() {
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-badge">⚿</span>
          <span className="navbar__logo-text">متجر<em>النادرة</em></span>
        </Link>

        {/* Desktop links */}
        <div className="navbar__links">
          <Link to="/" className="navbar__link">الرئيسية</Link>
          <Link to="/products" className="navbar__link">المنتجات</Link>
          <Link to="/products?category=ford-parts" className="navbar__link">قطع فورد</Link>
          <Link to="/products?category=police-collectibles" className="navbar__link">نوادر بوليسية</Link>
        </div>

        {/* Actions */}
        <div className="navbar__actions">
          <button
            className="navbar__cart-btn"
            onClick={() => navigate("/cart")}
            aria-label="عربة التسوق"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {totalItems > 0 && (
              <span className="navbar__cart-count">{totalItems}</span>
            )}
          </button>

          {/* Hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="القائمة"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile" onClick={() => setMenuOpen(false)}>
          <Link to="/" className="navbar__mobile-link">الرئيسية</Link>
          <Link to="/products" className="navbar__mobile-link">المنتجات</Link>
          <Link to="/products?category=ford-parts" className="navbar__mobile-link">قطع فورد</Link>
          <Link to="/products?category=police-collectibles" className="navbar__mobile-link">نوادر بوليسية</Link>
          <Link to="/cart" className="navbar__mobile-link">عربة التسوق ({totalItems})</Link>
        </div>
      )}
    </nav>
  );
}
