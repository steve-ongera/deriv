import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authAPI.login(form);
      navigate("/trade");
    } catch (err) {
      setError(err.message || "Couldn't log in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <style>{styles}</style>
      
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">
            <span>SmartTrader</span>
          </div>
          <p className="auth-brand-tagline">Trade the last digit, every second</p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-header">
            <span className="auth-eyebrow">Welcome back</span>
            <h1 className="auth-title">Sign in to your account</h1>
            <p className="auth-subtitle">Access your trading dashboard and start earning</p>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="username">Username</label>
            <div className="auth-input-wrapper">
              <i className="bi bi-person auth-input-icon"></i>
              <input
                id="username"
                className="auth-input"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <i className="bi bi-lock auth-input-icon"></i>
              <input
                id="password"
                type="password"
                className="auth-input"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="auth-error">
              <i className="bi bi-exclamation-circle"></i>
              {error}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <i className="bi bi-hourglass-split"></i> Signing in…
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i> Sign in
              </>
            )}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one now</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = `
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  background: #0a0e14;
  background-image: 
    radial-gradient(ellipse at 10% 20%, rgba(45, 212, 191, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 80%, rgba(45, 212, 191, 0.05) 0%, transparent 50%);
}

.auth-container {
  width: 100%;
  max-width: 420px;
}

.auth-brand {
  text-align: center;
  margin-bottom: 32px;
}
.auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  font-family: var(--font-display);
}
.auth-logo i {
  color: #2dd4bf;
  font-size: 32px;
}
.auth-brand-tagline {
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  margin: 4px 0 0;
}

.auth-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 36px;
  backdrop-filter: blur(10px);
}

.auth-header {
  margin-bottom: 28px;
}
.auth-eyebrow {
  display: block;
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.auth-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #ffffff;
}
.auth-subtitle {
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  margin: 0;
}

.auth-field {
  margin-bottom: 18px;
}
.auth-label {
  display: block;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.auth-input-wrapper {
  position: relative;
}
.auth-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.3);
  font-size: 18px;
  pointer-events: none;
}
.auth-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #ffffff;
  font-size: 15px;
  padding: 13px 14px 13px 44px;
  transition: all 0.2s ease;
}
.auth-input:focus {
  outline: none;
  border-color: #2dd4bf;
  background: rgba(45, 212, 191, 0.05);
}
.auth-input::placeholder {
  color: rgba(255,255,255,0.25);
}

.auth-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: #ef4444;
  font-size: 13px;
  margin: 16px 0 0;
}
.auth-error i {
  font-size: 18px;
  flex-shrink: 0;
}

.auth-submit {
  width: 100%;
  margin-top: 24px;
  padding: 14px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  color: #06110d;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}
.auth-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(45, 212, 191, 0.3);
}
.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 20px 0 18px;
  color: rgba(255,255,255,0.2);
  font-size: 13px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.auth-divider span {
  padding: 0 16px;
}

.auth-switch {
  text-align: center;
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  margin: 0;
}
.auth-switch a {
  color: #2dd4bf;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}
.auth-switch a:hover {
  color: #0d9488;
  text-decoration: underline;
}
`;

export { LoginPage };