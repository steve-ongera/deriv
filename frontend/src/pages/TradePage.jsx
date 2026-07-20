import { useCallback, useEffect, useRef, useState } from "react";
import { marketAPI, tradesAPI, walletAPI } from "../services/api.js";

const STAKE_PRESETS = [50, 100, 250, 500];
const DURATION_PRESETS = [5, 10, 15, 20];
const BARRIER = 5; // must match backend OVER_UNDER_BARRIER

export default function TradePage() {
  const [ticks, setTicks] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [trades, setTrades] = useState([]);

  const [contractType, setContractType] = useState("even_odd");
  const [prediction, setPrediction] = useState("even");
  const [stake, setStake] = useState(50);
  const [durationTicks, setDurationTicks] = useState(5);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(null); // { text, kind: 'won'|'lost' }

  const prevTradeStatus = useRef({});

  // -- polling: price ticks every second --------------------------------
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const data = await marketAPI.getTicks(40);
        if (!cancelled) setTicks(data.ticks);
      } catch {
        /* transient network hiccup — ignore, next poll will retry */
      }
    };
    pull();
    const id = setInterval(pull, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // -- polling: wallet + trades (this is also what settles due trades) --
  const refreshWalletAndTrades = useCallback(async () => {
    try {
      const [walletData, tradeList] = await Promise.all([
        walletAPI.getWallet(),
        tradesAPI.listTrades(),
      ]);
      setWallet(walletData);

      for (const t of tradeList) {
        const prevStatus = prevTradeStatus.current[t.id];
        if (prevStatus === "open" && t.status !== "open") {
          setFlash({
            text:
              t.status === "won"
                ? `Won — +${formatMoney(t.profit)}`
                : `Lost — ${formatMoney(t.profit)}`,
            kind: t.status,
          });
        }
        prevTradeStatus.current[t.id] = t.status;
      }
      setTrades(tradeList);
    } catch {
      /* ignore transient errors during polling */
    }
  }, []);

  useEffect(() => {
    refreshWalletAndTrades();
    const id = setInterval(refreshWalletAndTrades, 2000);
    return () => clearInterval(id);
  }, [refreshWalletAndTrades]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(id);
  }, [flash]);

  // -- place trade --------------------------------------------------------
  async function handlePlaceTrade() {
    setError("");
    setPlacing(true);
    try {
      const trade = await tradesAPI.placeTrade({
        contract_type: contractType,
        prediction,
        stake,
        duration_ticks: durationTicks,
      });
      prevTradeStatus.current[trade.id] = trade.status;
      setTrades((prev) => [trade, ...prev]);
      const walletData = await walletAPI.getWallet();
      setWallet(walletData);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  function handleContractType(type) {
    setContractType(type);
    setPrediction(type === "even_odd" ? "even" : "over");
  }

  const lastTick = ticks[ticks.length - 1];
  const openTrades = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status !== "open").slice(0, 8);

  return (
    <div className="tp-page">
      <style>{styles}</style>

      {flash && (
        <div className={`tp-flash tp-flash--${flash.kind}`} role="status">
          {flash.text}
        </div>
      )}

      <div className="tp-grid">
        {/* ---------------- Chart + digit readout ---------------- */}
        <section className="tp-panel tp-chart-panel">
          <div className="tp-panel-head">
            <div>
              <span className="tp-eyebrow">Synthetic Index</span>
              <h1 className="tp-title">VOL-100</h1>
            </div>
            <div className="tp-digit-readout">
              <span className="tp-digit-label">Last digit</span>
              <span
                className={`tp-digit ${
                  lastTick ? (lastTick.digit % 2 === 0 ? "tp-digit--even" : "tp-digit--odd") : ""
                }`}
              >
                {lastTick ? lastTick.digit : "–"}
              </span>
            </div>
          </div>

          <PriceChart ticks={ticks} barrier={BARRIER} showBarrier={contractType === "over_under"} />

          <div className="tp-price-row">
            <span className="tp-price">{lastTick ? formatMoney(lastTick.price) : "—"}</span>
            <span className="tp-price-sub">updates every second, from a deterministic tick engine</span>
          </div>
        </section>

        {/* ---------------- Ticket ---------------- */}
        <section className="tp-panel tp-ticket">
          <div className="tp-wallet-row">
            <span className="tp-eyebrow">Balance</span>
            <span className="tp-balance">{wallet ? formatMoney(wallet.balance) : "—"}</span>
          </div>

          <div className="tp-tabs">
            <button
              className={`tp-tab ${contractType === "even_odd" ? "tp-tab--active" : ""}`}
              onClick={() => handleContractType("even_odd")}
            >
              Even / Odd
            </button>
            <button
              className={`tp-tab ${contractType === "over_under" ? "tp-tab--active" : ""}`}
              onClick={() => handleContractType("over_under")}
            >
              Over / Under {BARRIER}
            </button>
          </div>

          {contractType === "even_odd" ? (
            <div className="tp-choice-row">
              <button
                className={`tp-choice tp-choice--even ${prediction === "even" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("even")}
              >
                Even
              </button>
              <button
                className={`tp-choice tp-choice--odd ${prediction === "odd" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("odd")}
              >
                Odd
              </button>
            </div>
          ) : (
            <div className="tp-choice-row">
              <button
                className={`tp-choice tp-choice--over ${prediction === "over" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("over")}
              >
                Over {BARRIER}
              </button>
              <button
                className={`tp-choice tp-choice--under ${prediction === "under" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("under")}
              >
                Under {BARRIER}
              </button>
            </div>
          )}

          <label className="tp-field-label" htmlFor="tp-stake">
            Stake
          </label>
          <input
            id="tp-stake"
            type="number"
            min="10"
            className="tp-input"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
          />
          <div className="tp-preset-row">
            {STAKE_PRESETS.map((v) => (
              <button key={v} className="tp-preset" onClick={() => setStake(v)}>
                {v}
              </button>
            ))}
          </div>

          <label className="tp-field-label" htmlFor="tp-duration">
            Duration (ticks)
          </label>
          <div className="tp-preset-row">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                className={`tp-preset ${durationTicks === d ? "tp-preset--active" : ""}`}
                onClick={() => setDurationTicks(d)}
              >
                {d}
              </button>
            ))}
          </div>

          {error && <p className="tp-error">{error}</p>}

          <button className="tp-submit" onClick={handlePlaceTrade} disabled={placing}>
            {placing ? "Placing…" : `Place trade — ${formatMoney(stake)}`}
          </button>
        </section>
      </div>

      {/* ---------------- Positions ---------------- */}
      <section className="tp-panel tp-positions">
        <h2 className="tp-section-title">Open positions</h2>
        {openTrades.length === 0 ? (
          <p className="tp-empty">No open trades — place one above.</p>
        ) : (
          <TradeTable trades={openTrades} />
        )}

        <h2 className="tp-section-title tp-section-title--spaced">Recent history</h2>
        {closedTrades.length === 0 ? (
          <p className="tp-empty">Settled trades will show up here.</p>
        ) : (
          <TradeTable trades={closedTrades} />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function PriceChart({ ticks, barrier, showBarrier }) {
  const width = 600;
  const height = 160;
  const padding = 12;

  if (ticks.length < 2) {
    return (
      <div className="tp-chart-empty" style={{ height }}>
        Loading price feed…
      </div>
    );
  }

  const prices = ticks.map((t) => Number(t.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = ticks.map((t, i) => {
    const x = padding + (i / (ticks.length - 1)) * (width - padding * 2);
    const y = height - padding - ((Number(t.price) - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const lastDigit = ticks[ticks.length - 1].digit;
  const lastEven = lastDigit % 2 === 0;

  return (
    <svg className="tp-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {showBarrier && (
        <line
          x1={padding}
          x2={width - padding}
          y1={height / 2}
          y2={height / 2}
          className="tp-barrier-line"
        />
      )}
      <path d={path} className="tp-chart-line" />
      <circle cx={last[0]} cy={last[1]} r="4" className={`tp-chart-dot ${lastEven ? "tp-chart-dot--even" : "tp-chart-dot--odd"}`} />
    </svg>
  );
}

function TradeTable({ trades }) {
  return (
    <table className="tp-table">
      <thead>
        <tr>
          <th>Contract</th>
          <th>Prediction</th>
          <th>Stake</th>
          <th>Status</th>
          <th>P/L</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id}>
            <td>{t.contract_type === "even_odd" ? "Even/Odd" : `Over/Under ${t.barrier}`}</td>
            <td className="tp-table-pred">{t.prediction}</td>
            <td>{formatMoney(t.stake)}</td>
            <td>
              <span className={`tp-badge tp-badge--${t.status}`}>{t.status}</span>
            </td>
            <td className={t.profit == null ? "" : Number(t.profit) >= 0 ? "tp-profit-pos" : "tp-profit-neg"}>
              {t.profit == null ? "—" : formatMoney(t.profit)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatMoney(value) {
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Styles — dark trading-terminal look; the last-digit readout is the
// signature element, since digit parity is literally what's being traded.
// ---------------------------------------------------------------------------
const styles = `
.tp-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px 64px;
  position: relative;
}

.tp-flash {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 18px;
  border-radius: 10px;
  font-family: var(--font-mono);
  font-weight: 600;
  z-index: 50;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  animation: tp-flash-in 0.25s ease-out;
}
.tp-flash--won { color: var(--even); border-color: var(--even); }
.tp-flash--lost { color: var(--odd); border-color: var(--odd); }
@keyframes tp-flash-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.tp-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}
@media (max-width: 860px) {
  .tp-grid { grid-template-columns: 1fr; }
}

.tp-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
}

.tp-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tp-eyebrow {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.tp-title {
  font-family: var(--font-display);
  font-size: 26px;
  margin: 2px 0 0;
}

.tp-digit-readout {
  text-align: right;
}
.tp-digit-label {
  display: block;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.tp-digit {
  font-family: var(--font-mono);
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  transition: color 0.2s;
}
.tp-digit--even { color: var(--even); }
.tp-digit--odd { color: var(--odd); }

.tp-chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 13px;
}

.tp-chart {
  width: 100%;
  height: 160px;
  display: block;
}
.tp-chart-line {
  fill: none;
  stroke: var(--under);
  stroke-width: 2;
}
.tp-chart-dot--even { fill: var(--even); }
.tp-chart-dot--odd { fill: var(--odd); }
.tp-barrier-line {
  stroke: var(--over);
  stroke-width: 1;
  stroke-dasharray: 4 4;
  opacity: 0.6;
}

.tp-price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 8px;
}
.tp-price {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
}
.tp-price-sub {
  font-size: 12px;
  color: var(--muted);
}

.tp-wallet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.tp-balance {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
}

.tp-tabs {
  display: flex;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 14px;
}
.tp-tab {
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
.tp-tab--active {
  background: var(--surface-raised);
  color: var(--text);
}

.tp-choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.tp-choice {
  padding: 14px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
}
.tp-choice--even.tp-choice--active { border-color: var(--even); color: var(--even); }
.tp-choice--odd.tp-choice--active { border-color: var(--odd); color: var(--odd); }
.tp-choice--over.tp-choice--active { border-color: var(--over); color: var(--over); }
.tp-choice--under.tp-choice--active { border-color: var(--under); color: var(--under); }

.tp-field-label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 10px 0 6px;
}
.tp-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 16px;
  padding: 10px 12px;
}

.tp-preset-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.tp-preset {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 8px;
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
}
.tp-preset--active {
  border-color: var(--under);
  color: var(--under);
}

.tp-error {
  color: var(--odd);
  font-size: 13px;
  margin: 10px 0 0;
}

.tp-submit {
  width: 100%;
  margin-top: 18px;
  padding: 14px;
  border-radius: 10px;
  border: none;
  background: var(--even);
  color: #06110d;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}
.tp-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tp-positions {
  margin-top: 20px;
}
.tp-section-title {
  font-family: var(--font-display);
  font-size: 16px;
  margin: 0 0 10px;
}
.tp-section-title--spaced {
  margin-top: 22px;
}
.tp-empty {
  color: var(--muted);
  font-size: 13px;
}

.tp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tp-table th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.tp-table td {
  padding: 8px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
}
.tp-table-pred {
  text-transform: capitalize;
}

.tp-badge {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: capitalize;
  font-family: var(--font-body);
  font-weight: 600;
}
.tp-badge--open { background: rgba(95,168,255,0.15); color: var(--under); }
.tp-badge--won { background: rgba(47,217,166,0.15); color: var(--even); }
.tp-badge--lost { background: rgba(255,93,115,0.15); color: var(--odd); }

.tp-profit-pos { color: var(--even); }
.tp-profit-neg { color: var(--odd); }
`;