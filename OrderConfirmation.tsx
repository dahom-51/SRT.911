import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentsApi } from "@/lib/api";
import "./OrderConfirmation.css";

type Status = "loading" | "paid" | "cod" | "pending" | "failed";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const orderId        = Number(searchParams.get("orderId"));
  const isCod          = searchParams.get("method") === "cod";

  const [status, setStatus] = useState<Status>(isCod ? "cod" : "loading");

  useEffect(() => {
    if (isCod || !orderId) return;

    // Poll up to 10 times (20 sec) for payment confirmation
    let attempts = 0;
    const poll = async () => {
      try {
        const data = await paymentsApi.status(orderId);
        if (data.status === "paid") {
          setStatus("paid");
        } else if (data.status === "failed") {
          setStatus("failed");
        } else if (attempts >= 10) {
          setStatus("pending");
        } else {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch {
        setStatus("failed");
      }
    };

    poll();
  }, [orderId, isCod]);

  const configs = {
    loading: {
      icon:    <div className="spinner" style={{ width: 48, height: 48 }} />,
      title:   "جاري التحقق من الدفع...",
      desc:    "يرجى الانتظار، لا تغلق هذه الصفحة",
      color:   "var(--text2)",
      actions: null,
    },
    paid: {
      icon:    <div className="confirm-icon confirm-icon--success">✓</div>,
      title:   "تم الدفع بنجاح!",
      desc:    `طلبك رقم #${orderId} تم تأكيده وسيتم شحنه قريباً`,
      color:   "var(--success)",
      actions: (
        <>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/")}>العودة للرئيسية</button>
          <button className="btn btn-outline" onClick={() => navigate("/products")}>مواصلة التسوق</button>
        </>
      ),
    },
    cod: {
      icon:    <div className="confirm-icon confirm-icon--info">📦</div>,
      title:   "تم استلام طلبك!",
      desc:    `طلبك رقم #${orderId} مؤكد وسيتم التواصل معك قريباً`,
      color:   "var(--info)",
      actions: (
        <>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/")}>العودة للرئيسية</button>
          <button className="btn btn-outline" onClick={() => navigate("/products")}>مواصلة التسوق</button>
        </>
      ),
    },
    pending: {
      icon:    <div className="confirm-icon confirm-icon--warn">⏳</div>,
      title:   "الدفع قيد المعالجة",
      desc:    "لم يتم تأكيد الدفع بعد. ستتلقى إشعاراً عند اكتمال العملية",
      color:   "#f59e0b",
      actions: (
        <button className="btn btn-primary" onClick={() => navigate("/")}>العودة للرئيسية</button>
      ),
    },
    failed: {
      icon:    <div className="confirm-icon confirm-icon--danger">✕</div>,
      title:   "فشل الدفع",
      desc:    "لم تتم عملية الدفع. يمكنك المحاولة مجدداً",
      color:   "var(--danger)",
      actions: (
        <>
          <button className="btn btn-primary" onClick={() => navigate("/checkout")}>إعادة المحاولة</button>
          <button className="btn btn-outline" onClick={() => navigate("/")}>العودة للرئيسية</button>
        </>
      ),
    },
  };

  const cfg = configs[status];

  return (
    <div className="confirmation-page page-enter">
      <div className="confirmation-card">
        <div className="confirmation-card__icon">{cfg.icon}</div>
        <h1 className="confirmation-card__title" style={{ color: cfg.color }}>
          {cfg.title}
        </h1>
        <p className="confirmation-card__desc">{cfg.desc}</p>
        {cfg.actions && (
          <div className="confirmation-card__actions">{cfg.actions}</div>
        )}
      </div>
    </div>
  );
}
