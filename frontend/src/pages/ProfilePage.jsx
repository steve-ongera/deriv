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
        <p className="pf-loading">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <style>{styles}</style>

      <div className="pf-header">
        <div className="pf-avatar">{initials(user)}</div>
        <div>
          <h1 className="pf-username">{user.username}</h1>
          <p className="pf-joined">
            Member since {new Date(user.date_joined).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="pf-balance-card">
          <span className="pf-balance-label">Balance</span>
          <span className="pf-balance-value">
            {wallet ? Number(wallet.balance).toFixed(2) : "—"} {wallet?.currency}
          </span>
          <Link to="/wallet" className="pf-balance-link">Manage wallet →</Link>
        </div>
      </div>

      <form className="pf-card" onSubmit={handleSave}>
        <h2 className="pf-card-title">Account details</h2>

        <label className="pf-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="pf-input"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />

        <div className="pf-row">
          <div>
            <label className="pf-label" htmlFor="first_name">First name</label>
            <input
              id="first_name"
              className="pf-input"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
            />
          </div>
          <div>
            <label className="pf-label" htmlFor="last_name">Last name</label>
            <input
              id="last_name"
              className="pf-input"
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
            />
          </div>
        </div>

        {error && <p className="pf-error">{error}</p>}
        {saved && <p className="pf-saved">Changes saved.</p>}

        <button className="pf-submit" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
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
.pf-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px 64px;
}
.pf-loading {
  color: var(--muted);
  text-align: center;
  padding: 60px 0;
}

.pf-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.pf-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--even);
  flex-shrink: 0;
}
.pf-username {
  font-family: var(--font-display);
  font-size: 22px;
  margin: 0;
}
.pf-joined {
  color: var(--muted);
  font-size: 13px;
  margin: 4px 0 0;
}

.pf-balance-card {
  margin-left: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.pf-balance-label {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.pf-balance-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--even);
}
.pf-balance-link {
  font-size: 12px;
  color: var(--under);
  text-decoration: none;
  margin-top: 4px;
}

.pf-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
}
.pf-card-title {
  font-family: var(--font-display);
  font-size: 18px;
  margin: 0 0 6px;
}
.pf-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.pf-label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 14px 0 6px;
}
.pf-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 15px;
  padding: 11px 12px;
}
.pf-error {
  color: var(--odd);
  font-size: 13px;
  margin: 14px 0 0;
}
.pf-saved {
  color: var(--even);
  font-size: 13px;
  margin: 14px 0 0;
}
.pf-submit {
  margin-top: 20px;
  padding: 12px 22px;
  border-radius: 10px;
  border: none;
  background: var(--even);
  color: #06110d;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.pf-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
`;