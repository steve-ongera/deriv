import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, marketAPI } from "../services/api.js";

const FEATURES = [
  {
    label: "Even / Odd",
    accent: "even",
    title: "Call the parity",
    body: "Predict whether the last digit of the next tick lands on an even or odd number. Simple, fast, binary.",
    icon: "bi bi-arrow-left-right",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop&crop=center",
  },
  {
    label: "Over / Under",
    accent: "over",
    title: "Call the barrier",
    body: "Predict whether the last digit finishes above or below 5. Same tick engine, a different read on the same number.",
    icon: "bi bi-bar-chart-line",
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop&crop=center",
  },
];

const PAYMENT_METHODS = [
  { 
    name: "M-Pesa", 
    detail: "STK push deposits, instant B2C withdrawals",
    icon: "bi bi-phone",
    bg: "linear-gradient(135deg, #6c2bd9, #8b5cf6)"
  },
  { 
    name: "PayPal", 
    detail: "Card or balance deposits, payouts to your email",
    icon: "bi bi-paypal",
    bg: "linear-gradient(135deg, #003087, #009cde)"
  },
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
        <div className="hp-hero-container">
          <div className="hp-hero-content">
            
            <h1 className="hp-headline">
              Trade the <span className="hp-headline-accent">last digit</span>,<br />every second.
            </h1>
            <p className="hp-subhead">
              VoltTrade runs a live simulated price feed you can trade on with short, fixed-duration
              digit contracts — Even/Odd and Over/Under. Fund your account with M-Pesa or PayPal and
              place your first trade in under a minute.
            </p>
            <div className="hp-cta-row">
              {isAuthed ? (
                <Link to="/trade" className="hp-btn hp-btn--primary">
                  <i className="bi bi-graph-up-arrow"></i> Go to trading
                </Link>
              ) : (
                <>
                  <Link to="/register" className="hp-btn hp-btn--primary">
                    <i className="bi bi-person-plus"></i> Create free account
                  </Link>
                  <Link to="/login" className="hp-btn hp-btn--secondary">
                    <i className="bi bi-box-arrow-in-right"></i> Log in
                  </Link>
                </>
              )}
            </div>
            <div className="hp-trust-badges">
              <span><i className="bi bi-shield-check"></i> Secure & Regulated</span>
              <span><i className="bi bi-clock-history"></i> 24/7 Trading</span>
              <span><i className="bi bi-people"></i> 2.4K+ Active Traders</span>
            </div>
          </div>

          <div className="hp-hero-visual">
            <div className="hp-hero-image-wrapper">
              <img 
                src="https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=600&fit=crop&crop=center" 
                alt="Trading dashboard" 
                className="hp-hero-image"
                loading="lazy"
              />
              <div className="hp-hero-image-overlay"></div>
            </div>
            
            <div className="hp-live-ticker">
              <div className="hp-ticker-header">
                <span className="hp-ticker-dot"></span>
                <span className="hp-ticker-label">Live Feed</span>
                <span className="hp-ticker-symbol">VOL-100</span>
              </div>
              <div className="hp-ticker-display">
                <span className="hp-ticker-digit-label">Last Digit</span>
                <span
                  className={`hp-ticker-digit ${
                    digit === null ? "" : digit % 2 === 0 ? "hp-ticker-digit--even" : "hp-ticker-digit--odd"
                  }`}
                >
                  {digit === null ? "—" : digit}
                </span>
                <span className="hp-ticker-status">
                  <i className="bi bi-broadcast"></i> Live
                </span>
              </div>
              <div className="hp-ticker-footer">
                <span>Updates every second</span>
                <span className="hp-ticker-time">
                  <i className="bi bi-clock"></i> Real-time
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="hp-section">
        <div className="hp-section-header">
          <span className="hp-section-eyebrow">Trading Options</span>
          <h2 className="hp-section-title">Two ways to read the same tick</h2>
          <p className="hp-section-subtitle">Choose your strategy and start trading instantly</p>
        </div>
        <div className="hp-feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="hp-feature-card">
              <div className="hp-feature-image">
                <img src={f.image} alt={f.title} loading="lazy" />
                <div className="hp-feature-image-overlay"></div>
                <div className="hp-feature-badge">
                  <i className={f.icon}></i>
                </div>
              </div>
              <div className="hp-feature-content">
                <span className={`hp-feature-label hp-feature-label--${f.accent}`}>
                  {f.label}
                </span>
                <h3 className="hp-feature-title">{f.title}</h3>
                <p className="hp-feature-body">{f.body}</p>
                <Link to="/trade" className="hp-feature-link">
                  Start trading <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Payments ---------------- */}
      <section className="hp-section hp-section--dark">
        <div className="hp-section-header">
          <span className="hp-section-eyebrow">Payment Methods</span>
          <h2 className="hp-section-title">Deposit and withdraw your way</h2>
          <p className="hp-section-subtitle">Fast, secure, and convenient payment methods</p>
        </div>
        <div className="hp-payment-grid">
          {PAYMENT_METHODS.map((m) => (
            <div key={m.name} className="hp-payment-card" style={{ background: m.bg }}>
              <i className={`${m.icon} hp-payment-icon`}></i>
              <div className="hp-payment-content">
                <span className="hp-payment-name">{m.name}</span>
                <p className="hp-payment-detail">
                  <i className="bi bi-check-circle-fill"></i> {m.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="hp-security-badge">
          <i className="bi bi-shield-lock-fill"></i>
          <span>256-bit SSL encrypted · PCI compliant</span>
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      {!isAuthed && (
        <section className="hp-closing">
          <div className="hp-closing-content">
            <h2 className="hp-closing-title">Ready to place your first trade?</h2>
            <p className="hp-closing-subtitle">Join thousands of traders and start earning today</p>
            <Link to="/register" className="hp-btn hp-btn--primary hp-btn--large">
              <i className="bi bi-rocket-takeoff"></i> Get started now
            </Link>
            <p className="hp-closing-note">
              <i className="bi bi-clock"></i> Takes less than 2 minutes
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

const styles = `
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

:root {
  --even: #2dd4bf;
  --odd: #f97316;
  --over: #fbbf24;
  --surface: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.08);
  --text: #ffffff;
  --muted: rgba(255, 255, 255, 0.6);
}

.hp-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 80px;
  background: #0a0e14;
  color: var(--text);
}

/* Hero Section */
.hp-hero {
  padding: 40px 0 60px;
  position: relative;
}

.hp-hero-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

@media (max-width: 968px) {
  .hp-hero-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

.hp-hero-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hp-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--even);
  background: rgba(45, 212, 191, 0.1);
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(45, 212, 191, 0.2);
  width: fit-content;
  letter-spacing: 0.5px;
}

.hp-badge i {
  font-size: 14px;
}

.hp-headline {
  font-size: clamp(38px, 5vw, 56px);
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
  letter-spacing: -0.02em;
}

.hp-headline-accent {
  background: linear-gradient(135deg, var(--even), #0d9488);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hp-subhead {
  font-size: 16px;
  line-height: 1.7;
  color: var(--muted);
  margin: 0;
  max-width: 520px;
}

.hp-cta-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.hp-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 28px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  cursor: pointer;
}

.hp-btn--primary {
  background: linear-gradient(135deg, var(--even), #0d9488);
  color: #0a0e14;
  box-shadow: 0 4px 20px rgba(45, 212, 191, 0.25);
}

.hp-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(45, 212, 191, 0.35);
}

.hp-btn--secondary {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
}

.hp-btn--secondary:hover {
  border-color: var(--even);
  background: rgba(45, 212, 191, 0.05);
}

.hp-btn--large {
  font-size: 17px;
  padding: 16px 40px;
}

.hp-trust-badges {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding-top: 8px;
}

.hp-trust-badges span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.hp-trust-badges i {
  color: var(--even);
  font-size: 16px;
}

/* Hero Visual */
.hp-hero-visual {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hp-hero-image-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.hp-hero-image {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

.hp-hero-image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(10, 14, 20, 0.6));
  pointer-events: none;
}

/* Live Ticker */
.hp-live-ticker {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px 24px;
}

.hp-ticker-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.hp-ticker-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hp-ticker-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.hp-ticker-symbol {
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
  font-family: monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 12px;
  border-radius: 6px;
}

.hp-ticker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.hp-ticker-digit-label {
  font-size: 13px;
  color: var(--muted);
}

.hp-ticker-digit {
  font-size: 48px;
  font-weight: 700;
  font-family: monospace;
  transition: color 0.3s ease;
}

.hp-ticker-digit--even { color: var(--even); }
.hp-ticker-digit--odd { color: var(--odd); }

.hp-ticker-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #22c55e;
}

.hp-ticker-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
}

.hp-ticker-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Sections */
.hp-section {
  padding: 64px 0 0;
}

.hp-section--dark {
  padding: 64px 0 40px;
}

.hp-section-header {
  margin-bottom: 32px;
}

.hp-section-eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--even);
  margin-bottom: 8px;
}

.hp-section-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
}

.hp-section-subtitle {
  font-size: 15px;
  color: var(--muted);
  margin: 0;
}

/* Feature Cards */
.hp-feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 640px) {
  .hp-feature-grid {
    grid-template-columns: 1fr;
  }
}

.hp-feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.hp-feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--even);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.hp-feature-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.hp-feature-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.hp-feature-card:hover .hp-feature-image img {
  transform: scale(1.05);
}

.hp-feature-image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(10, 14, 20, 0.7));
}

.hp-feature-badge {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(10, 14, 20, 0.8);
  backdrop-filter: blur(8px);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  color: white;
}

.hp-feature-badge i {
  font-size: 24px;
}

.hp-feature-content {
  padding: 24px;
}

.hp-feature-label {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.hp-feature-label--even { 
  background: rgba(45, 212, 191, 0.12); 
  color: var(--even); 
}

.hp-feature-label--over { 
  background: rgba(251, 191, 36, 0.12); 
  color: var(--over); 
}

.hp-feature-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
}

.hp-feature-body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
  margin: 0 0 16px;
}

.hp-feature-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--even);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  transition: gap 0.2s ease;
}

.hp-feature-link:hover {
  gap: 12px;
}

/* Payment Cards */
.hp-payment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 640px) {
  .hp-payment-grid {
    grid-template-columns: 1fr;
  }
}

.hp-payment-card {
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: white;
  transition: transform 0.3s ease;
}

.hp-payment-card:hover {
  transform: translateY(-3px);
}

.hp-payment-icon {
  font-size: 36px;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px;
  border-radius: 12px;
}

.hp-payment-content {
  flex: 1;
}

.hp-payment-name {
  font-size: 20px;
  font-weight: 700;
  display: block;
}

.hp-payment-detail {
  font-size: 13px;
  margin: 4px 0 0;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hp-security-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  font-size: 13px;
}

.hp-security-badge i {
  color: var(--even);
  font-size: 18px;
}

/* Closing CTA */
.hp-closing {
  margin-top: 64px;
  padding: 56px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(45, 212, 191, 0.08), rgba(13, 148, 136, 0.04));
  border: 1px solid var(--border);
  text-align: center;
}

.hp-closing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.hp-closing-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.hp-closing-subtitle {
  font-size: 16px;
  color: var(--muted);
  margin: 0;
}

.hp-closing-note {
  font-size: 14px;
  color: var(--muted);
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .hp-page {
    padding: 0 16px 60px;
  }
  
  .hp-hero {
    padding: 20px 0 40px;
  }
  
  .hp-hero-image {
    height: 220px;
  }
  
  .hp-ticker-digit {
    font-size: 36px;
  }
  
  .hp-closing {
    padding: 36px 24px;
  }
  
  .hp-trust-badges {
    gap: 16px;
  }
}
`;