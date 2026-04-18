import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/context";
import toast from "react-hot-toast";
import "./AdminLogin.css";

export default function AdminLogin() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [email,     setEmail]    = useState("");
  const [password,  setPassword] = useState("");
  const [loading,   setLoading]  = useState(false);
  const [showPass,  setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("يرجى إدخال البريد وكلمة المرور"); return; }
    setLoading(true);
    try {
      const { token, admin } = await authApi.login(email, password);
      login(token, admin);
      toast.success(`مرحباً، ${admin.name}`);
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "بيانات غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login page-enter">
      <div className="admin-login__card">
        <div className="admin-login__logo">
          <span>⚿</span>
          <span>لوحة التحكم</span>
        </div>

        <h1 className="admin-login__title">تسجيل الدخول</h1>
        <p className="admin-login__sub">للمسؤولين فقط</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="label">البريد الإلكتروني</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@store.com"
              dir="ltr"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="label">كلمة المرور</label>
            <div className="admin-login__pass-wrap">
              <input
                className="input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                autoComplete="current-password"
                required
              />
              <button type="button" className="admin-login__show-pass"
                onClick={() => setShowPass(v => !v)}>
                {showPass ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </form>

        <p className="admin-login__back">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")}>
            ← العودة للمتجر
          </button>
        </p>
      </div>
    </div>
  );
}
