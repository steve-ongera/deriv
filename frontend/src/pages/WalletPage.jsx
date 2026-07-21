import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { mpesaAPI, paypalAPI, walletAPI } from "../services/api.js";

const PHONE_PATTERN = /^254[17]\d{8}$/;

export default function WalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [mode, setMode] = useState("deposit"); // 'deposit' | 'withdraw'
  const [method, setMethod] = useState("mpesa"); // 'mpesa' | 'paypal'

  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaAmount, setMpesaAmount] = useState(100);
  const [paypalAmount, setPaypalAmount] = useState(10);
  const [paypalEmail, setPaypalEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [walletData, txns] = await Promise.all([
        walletAPI.getWallet(),
        walletAPI.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(txns);
    } catch {
      /* ignore transient errors during polling */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // Handle return from PayPal approval — PayPal appends ?token=<order_id>
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    (async () => {
      setBusy(true);
      setError("");
      try {
        const result = await paypalAPI.capture({ order_id: token });
        setNotice(
          result.status === "completed"
            ? "PayPal deposit completed — your balance has been updated."
            : "PayPal payment could not be completed."
        );
        await refresh();
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
        searchParams.delete("token");
        searchParams.delete("PayerID");
        searchParams.delete("paypal");
        setSearchParams(searchParams, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetMessages() {
    setError("");
    setNotice("");
  }

  async function handleMpesaDeposit(e) {
    e.preventDefault();
    resetMessages();
    if (!PHONE_PATTERN.test(mpesaPhone)) {
      setError("Enter a valid Safaricom number in the format 2547XXXXXXXX.");
      return;
    }
    setBusy(true);
    try {
      await mpesaAPI.deposit({ phone_number: mpesaPhone, amount: mpesaAmount });
      setNotice("STK push sent — approve the prompt on your phone to complete the deposit.");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMpesaWithdraw(e) {
    e.preventDefault();
    resetMessages();
    if (!PHONE_PATTERN.test(mpesaPhone)) {
      setError("Enter a valid Safaricom number in the format 2547XXXXXXXX.");
      return;
    }
    setBusy(true);
    try {
      await mpesaAPI.withdraw({ phone_number: mpesaPhone, amount: mpesaAmount });
      setNotice("Withdrawal initiated — funds are on their way to your M-Pesa line.");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePaypalDeposit(e) {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      const result = await paypalAPI.deposit({ amount: paypalAmount });
      if (result.approval_link) {
        window.location.href = result.approval_link;
        return;
      }
      setError("Could not start the PayPal checkout. Try again.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePaypalWithdraw(e) {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      await paypalAPI.withdraw({ paypal_email: paypalEmail, amount: paypalAmount });
      setNotice("Payout sent to your PayPal email.");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    if (mode === "deposit" && method === "mpesa") return handleMpesaDeposit(e);
    if (mode === "deposit" && method === "paypal") return handlePaypalDeposit(e);
    if (mode === "withdraw" && method === "mpesa") return handleMpesaWithdraw(e);
    return handlePaypalWithdraw(e);
  }

  return (
    <div className="wp-page">
      <style>{styles}</style>

      <div className="wp-balance-card">
        <span className="wp-balance-label">Balance</span>
        <span className="wp-balance-value">
          {wallet ? Number(wallet.balance).toFixed(2) : "—"} {wallet?.currency}
        </span>
      </div>

      <div className="wp-grid">
        {/* ---------------- Deposit / withdraw form ---------------- */}
        <section className="wp-panel">
          <div className="wp-tabs">
            <button
              className={`wp-tab ${mode === "deposit" ? "wp-tab--active" : ""}`}
              onClick={() => {
                setMode("deposit");
                resetMessages();
              }}
            >
              Deposit
            </button>
            <button
              className={`wp-tab ${mode === "withdraw" ? "wp-tab--active" : ""}`}
              onClick={() => {
                setMode("withdraw");
                resetMessages();
              }}
            >
              Withdraw
            </button>
          </div>

          <div className="wp-method-row">
            <button
              className={`wp-method ${method === "mpesa" ? "wp-method--active" : ""}`}
              onClick={() => {
                setMethod("mpesa");
                resetMessages();
              }}
            >
              M-Pesa
            </button>
            <button
              className={`wp-method ${method === "paypal" ? "wp-method--active" : ""}`}
              onClick={() => {
                setMethod("paypal");
                resetMessages();
              }}
            >
              PayPal
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {method === "mpesa" ? (
              <>
                <label className="wp-label" htmlFor="mpesaPhone">Phone number</label>
                <input
                  id="mpesaPhone"
                  className="wp-input"
                  placeholder="2547XXXXXXXX"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  required
                />

                <label className="wp-label" htmlFor="mpesaAmount">Amount (KES)</label>
                <input
                  id="mpesaAmount"
                  type="number"
                  min="10"
                  className="wp-input"
                  value={mpesaAmount}
                  onChange={(e) => setMpesaAmount(Number(e.target.value))}
                  required
                />
              </>
            ) : (
              <>
                {mode === "withdraw" && (
                  <>
                    <label className="wp-label" htmlFor="paypalEmail">PayPal email</label>
                    <input
                      id="paypalEmail"
                      type="email"
                      className="wp-input"
                      placeholder="you@example.com"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      required
                    />
                  </>
                )}

                <label className="wp-label" htmlFor="paypalAmount">Amount (USD)</label>
                <input
                  id="paypalAmount"
                  type="number"
                  min="1"
                  className="wp-input"
                  value={paypalAmount}
                  onChange={(e) => setPaypalAmount(Number(e.target.value))}
                  required
                />
              </>
            )}

            {error && <p className="wp-error">{error}</p>}
            {notice && <p className="wp-notice">{notice}</p>}

            <button className="wp-submit" type="submit" disabled={busy}>
              {busy
                ? "Processing…"
                : mode === "deposit"
                ? `Deposit via ${method === "mpesa" ? "M-Pesa" : "PayPal"}`
                : `Withdraw via ${method === "mpesa" ? "M-Pesa" : "PayPal"}`}
            </button>
          </form>
        </section>

        {/* ---------------- Transaction history ---------------- */}
        <section className="wp-panel">
          <h2 className="wp-section-title">Transaction history</h2>
          {transactions.length === 0 ? (
            <p className="wp-empty">No transactions yet.</p>
          ) : (
            <table className="wp-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="wp-cap">{t.type}</td>
                    <td>{t.method === "mpesa" ? "M-Pesa" : "PayPal"}</td>
                    <td>{Number(t.amount).toFixed(2)}</td>
                    <td>
                      <span className={`wp-badge wp-badge--${t.status}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = `
.wp-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 40px 20px 64px;
}

.wp-balance-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.wp-balance-label {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.wp-balance-value {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--even);
}

.wp-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 20px;
}
@media (max-width: 820px) {
  .wp-grid { grid-template-columns: 1fr; }
}

.wp-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px;
}

.wp-tabs {
  display: flex;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 14px;
}
.wp-tab {
  flex: 1;
  background: none;
  border: none;
  color: var(--muted);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.wp-tab--active {
  background: var(--surface-raised);
  color: var(--text);
}

.wp-method-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.wp-method {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--muted);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.wp-method--active {
  border-color: var(--under);
  color: var(--under);
}

.wp-label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 12px 0 6px;
}
.wp-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 15px;
  padding: 10px 12px;
}

.wp-error {
  color: var(--odd);
  font-size: 13px;
  margin: 14px 0 0;
}
.wp-notice {
  color: var(--even);
  font-size: 13px;
  margin: 14px 0 0;
  line-height: 1.5;
}

.wp-submit {
  width: 100%;
  margin-top: 18px;
  padding: 13px;
  border-radius: 10px;
  border: none;
  background: var(--even);
  color: #06110d;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.wp-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wp-section-title {
  font-family: var(--font-display);
  font-size: 17px;
  margin: 0 0 14px;
}
.wp-empty {
  color: var(--muted);
  font-size: 13px;
}

.wp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.wp-table th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.wp-table td {
  padding: 8px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
}
.wp-cap {
  text-transform: capitalize;
}

.wp-badge {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: capitalize;
  font-family: var(--font-body);
  font-weight: 600;
}
.wp-badge--pending { background: rgba(255,180,84,0.15); color: var(--over); }
.wp-badge--completed { background: rgba(47,217,166,0.15); color: var(--even); }
.wp-badge--failed { background: rgba(255,93,115,0.15); color: var(--odd); }
.wp-badge--cancelled { background: rgba(124,136,152,0.15); color: var(--muted); }
`;