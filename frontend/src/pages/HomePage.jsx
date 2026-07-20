import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, marketAPI } from "../services/api.js";

const FEATURES = [
  {
    label: "Even / Odd",
    accent: "even",
    title: "Call the parity",
    body: "Predict whether the last digit of the next tick lands on an even or odd number. Simple, fast, binary.",
  },
  {
    label: "Over / Under",
    accent: "over",
    title: "Call the barrier",
    body: "Predict whether the last digit finishes above or below 5. Same tick engine, a different read on the same number.",
  },
];

const PAYMENT_METHODS = [
  { name: "M-Pesa", detail: "STK push deposits, instant B2C withdrawals" },
  { name: "PayPal", detail: "Card or balance deposits, payouts to your email" },
];

export default function HomePage() {
  const [digit, setDigit] = useState(null);
  const isAuthed = auth.isAuthenticated();

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const data = await marketAPI.getTicks(1);
        if (!cancelled && data.ticks?.length) setDigit(data.ticks[data.ticks.length - 1].digit);
      } catch {
        /* ignore, decorative only */
      }
    };
    pull();
    const id = setInterval(pull, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="hp-page">
      <style>{styles}</style>

      {/* ---------------- Hero ---------------- */}
      <section className="hp-hero">
        <div className="hp-hero-copy">
          <span className="hp-eyebrow">Synthetic index trading</span>
          <h1 className="hp-headline">
            Trade the <span className="hp-headline-accent">last digit</span>, every second.
          </h1>
          <p className="hp-subhead">
            VoltTrade runs a live simulated price feed you can trade on with short, fixed-duration
            digit contracts — Even/Odd and Over/Under. Fund your account with M-Pesa or PayPal and
            place your first trade in under a minute.
          </p>
          <div className="hp-cta-row">
            {isAuthed ? (
              <Link to="/trade" className="hp-btn hp-btn--solid">Go to trading</Link>
            ) : (
              <>
                <Link to="/register" className="hp-btn hp-btn--solid">Create free account</Link>
                <Link to="/login" className="hp-btn hp-btn--ghost">Log in</Link>
              </>
            )}
          </div>
        </div>

        <div className="hp-hero-visual">
          <span className="hp-hero-visual-label">Live last digit</span>
          <span
            className={`hp-hero-digit ${
              digit === null ? "" : digit % 2 === 0 ? "hp-hero-digit--even" : "hp-hero-digit--odd"
            }`}
          >
            {digit === null ? "–" : digit}
          </span>
          <span className="hp-hero-visual-sub">VOL-100 · updates every second</span>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="hp-section">
        <h2 className="hp-section-title">Two ways to read the same tick</h2>
        <div className="hp-feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="hp-feature-card">
              <span className={`hp-feature-label hp-feature-label--${f.accent}`}>{f.label}</span>
              <h3 className="hp-feature-title">{f.title}</h3>
              <p className="hp-feature-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Payments ---------------- */}
      <section className="hp-section">
        <h2 className="hp-section-title">Deposit and withdraw your way</h2>
        <div className="hp-payment-grid">
          {PAYMENT_METHODS.map((m) => (
            <div key={m.name} className="hp-payment-card">
              <span className="hp-payment-name">{m.name}</span>
              <p className="hp-payment-detail">{m.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      {!isAuthed && (
        <section className="hp-closing">
          <h2 className="hp-closing-title">Ready to place your first trade?</h2>
          <Link to="/register" className="hp-btn hp-btn--solid">Get started</Link>
        </section>
      )}
    </div>
  );
}

const styles = `
.hp-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}

.hp-hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
  align-items: center;
  padding-bottom: 48px;
  border-bottom: 1px solid var(--border);
}
@media (max-width: 780px) {
  .hp-hero { grid-template-columns: 1fr; }
}

.hp-eyebrow {
  display: block;
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
}
.hp-headline {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.1;
  margin: 0 0 16px;
}
.hp-headline-accent {
  color: var(--even);
}
.hp-subhead {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 0 26px;
}

.hp-cta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.hp-btn {
  font-size: 14px;
  font-weight: 700;
  padding: 12px 22px;
  border-radius: 10px;
  text-decoration: none;
  border: 1px solid transparent;
  display: inline-block;
}
.hp-btn--solid {
  background: var(--even);
  color: #06110d;
}
.hp-btn--ghost {
  border-color: var(--border);
  color: var(--text);
}

.hp-hero-visual {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}
.hp-hero-visual-label {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.hp-hero-digit {
  font-family: var(--font-mono);
  font-size: 88px;
  font-weight: 700;
  line-height: 1;
  transition: color 0.2s;
  color: var(--muted);
}
.hp-hero-digit--even { color: var(--even); }
.hp-hero-digit--odd { color: var(--odd); }
.hp-hero-visual-sub {
  color: var(--muted);
  font-size: 12px;
  font-family: var(--font-mono);
}

.hp-section {
  padding-top: 48px;
}
.hp-section-title {
  font-family: var(--font-display);
  font-size: 24px;
  margin: 0 0 20px;
}

.hp-feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 640px) {
  .hp-feature-grid, .hp-payment-grid { grid-template-columns: 1fr; }
}
.hp-feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
}
.hp-feature-label {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}
.hp-feature-label--even { background: rgba(47,217,166,0.15); color: var(--even); }
.hp-feature-label--over { background: rgba(255,180,84,0.15); color: var(--over); }
.hp-feature-title {
  font-family: var(--font-display);
  font-size: 19px;
  margin: 0 0 8px;
}
.hp-feature-body {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
  margin: 0;
}

.hp-payment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.hp-payment-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px 24px;
}
.hp-payment-name {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
}
.hp-payment-detail {
  color: var(--muted);
  font-size: 13px;
  margin: 6px 0 0;
}

.hp-closing {
  margin-top: 56px;
  padding: 40px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: center;
}
.hp-closing-title {
  font-family: var(--font-display);
  font-size: 22px;
  margin: 0 0 18px;
}
`;