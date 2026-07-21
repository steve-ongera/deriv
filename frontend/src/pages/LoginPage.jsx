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
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="auth-eyebrow">Welcome back</span>
        <h1 className="auth-title">Log in</h1>

        <label className="auth-label" htmlFor="username">Username</label>
        <input
          id="username"
          className="auth-input"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          autoComplete="username"
          required
        />

        <label className="auth-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="auth-input"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

const styles = `
.auth-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
}
.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
}
.auth-eyebrow {
  display: block;
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.auth-title {
  font-family: var(--font-display);
  font-size: 26px;
  margin: 4px 0 22px;
}
.auth-label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 14px 0 6px;
}
.auth-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 15px;
  padding: 11px 12px;
}
.auth-error {
  color: var(--odd);
  font-size: 13px;
  margin: 14px 0 0;
}
.auth-submit {
  width: 100%;
  margin-top: 22px;
  padding: 13px;
  border-radius: 10px;
  border: none;
  background: var(--even);
  color: #06110d;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}
.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.auth-switch {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin: 18px 0 0;
}
.auth-switch a {
  color: var(--even);
  text-decoration: none;
  font-weight: 600;
}
`;