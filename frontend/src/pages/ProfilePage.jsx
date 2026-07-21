import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authAPI, walletAPI } from "../services/api.js";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "" });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [userData, walletData] = await Promise.all([authAPI.me(), walletAPI.getWallet()]);
        setUser(userData);
        setWallet(walletData);
        setForm({
          email: userData.email || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await authAPI.updateMe(form);
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pf-page">
        <style>{styles}</style>
        <div className="pf-loading">
          <i className="bi bi-hourglass-split"></i>
          <span>Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <style>{styles}</style>

      <div className="pf-header">
        <div className="pf-profile-info">
          <div className="pf-avatar-wrapper">
            <div className="pf-avatar">{initials(user)}</div>
          </div>
          <div>
            <h1 className="pf-username">
              {user.first_name || user.last_name ? 
                `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                user.username
              }
            </h1>
            <p className="pf-joined">
              <i className="bi bi-calendar3"></i>
              Member since {new Date(user.date_joined).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="pf-username-tag">
              <i className="bi bi-at"></i> {user.username}
            </p>
          </div>
        </div>

        <div className="pf-balance-card">
          <div className="pf-balance-header">
            <span className="pf-balance-label">
              <i className="bi bi-wallet2"></i> Available Balance
            </span>
          </div>
          <span className="pf-balance-value">
            {wallet ? Number(wallet.balance).toFixed(2) : "—"} 
            <span className="pf-balance-currency">{wallet?.currency || "USD"}</span>
          </span>
        </div>
      </div>

      <form className="pf-card" onSubmit={handleSave}>
        <div className="pf-card-header">
          <h2 className="pf-card-title">
            <i className="bi bi-person-gear"></i> Account Details
          </h2>
          <p className="pf-card-subtitle">Manage your personal information</p>
        </div>

        <div className="pf-form-group">
          <label className="pf-label" htmlFor="email">
            <i className="bi bi-envelope"></i> Email Address
          </label>
          <input
            id="email"
            type="email"
            className="pf-input"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        <div className="pf-row">
          <div className="pf-form-group">
            <label className="pf-label" htmlFor="first_name">
              <i className="bi bi-person"></i> First Name
            </label>
            <input
              id="first_name"
              className="pf-input"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder="John"
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label" htmlFor="last_name">
              <i className="bi bi-person"></i> Last Name
            </label>
            <input
              id="last_name"
              className="pf-input"
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        {error && (
          <div className="pf-message pf-message--error">
            <i className="bi bi-exclamation-circle"></i>
            {error}
          </div>
        )}
        
        {saved && (
          <div className="pf-message pf-message--success">
            <i className="bi bi-check-circle-fill"></i>
            Changes saved successfully!
          </div>
        )}

        <div className="pf-form-actions">
          <button className="pf-submit" type="submit" disabled={saving}>
            {saving ? (
              <>
                <i className="bi bi-hourglass-split"></i> Saving…
              </>
            ) : (
              <>
                <i className="bi bi-check-lg"></i> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function initials(user) {
  const source = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
}

const styles = `
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

.pf-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px 64px;
  background: #0a0e14;
  color: #ffffff;
  min-height: 100vh;
}

.pf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,255,255,0.4);
  font-size: 16px;
  padding: 80px 0;
}
.pf-loading i {
  font-size: 24px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Header */
.pf-header {
  display: flex;
  align-items: stretch;
  gap: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
@media (max-width: 768px) {
  .pf-header {
    flex-direction: column;
  }
}

.pf-profile-info {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}
.pf-avatar-wrapper {
  position: relative;
}
.pf-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  border: 2px solid rgba(45, 212, 191, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  color: #06110d;
  flex-shrink: 0;
}
.pf-username {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
}
.pf-joined {
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pf-joined i {
  font-size: 14px;
}
.pf-username-tag {
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  margin: 2px 0 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Balance Card */
.pf-balance-card {
  background: linear-gradient(135deg, rgba(45, 212, 191, 0.08), rgba(13, 148, 136, 0.04));
  border: 1px solid rgba(45, 212, 191, 0.15);
  border-radius: 16px;
  padding: 20px 24px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pf-balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.pf-balance-label {
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pf-balance-label i {
  font-size: 14px;
}
.pf-balance-value {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  color: #2dd4bf;
}
.pf-balance-currency {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255,255,255,0.4);
  margin-left: 4px;
}

/* Form Card */
.pf-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
}
.pf-card-header {
  margin-bottom: 24px;
}
.pf-card-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.pf-card-title i {
  color: #2dd4bf;
}
.pf-card-subtitle {
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  margin: 0;
}
.pf-form-group {
  margin-bottom: 18px;
}
.pf-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 640px) {
  .pf-row {
    grid-template-columns: 1fr;
  }
}
.pf-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.pf-label i {
  font-size: 14px;
}
.pf-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #ffffff;
  font-size: 15px;
  padding: 12px 14px;
  transition: all 0.2s ease;
}
.pf-input:focus {
  outline: none;
  border-color: #2dd4bf;
  background: rgba(45, 212, 191, 0.05);
}
.pf-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.pf-message {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}
.pf-message--error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.pf-message--success {
  background: rgba(45, 212, 191, 0.08);
  border: 1px solid rgba(45, 212, 191, 0.2);
  color: #2dd4bf;
}
.pf-message i {
  font-size: 18px;
}

.pf-form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.pf-submit {
  padding: 12px 32px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  color: #06110d;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}
.pf-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(45, 212, 191, 0.3);
}
.pf-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
`;

export { ProfilePage };