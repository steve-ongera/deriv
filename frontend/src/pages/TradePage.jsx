import { useCallback, useEffect, useRef, useState } from "react";
import { marketAPI, tradesAPI, walletAPI } from "../services/api.js";

const STAKE_PRESETS = [50, 100, 250, 500];
const DURATION_PRESETS = [5, 10, 15, 20];
const BARRIER = 5;

export default function TradePage() {
  const [ticks, setTicks] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tickCount, setTickCount] = useState(0);

  const [contractType, setContractType] = useState("even_odd");
  const [prediction, setPrediction] = useState("even");
  const [stake, setStake] = useState(50);
  const [durationTicks, setDurationTicks] = useState(5);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(null);

  const prevTradeStatus = useRef({});
  const chartContainerRef = useRef(null);

  // -- polling: price ticks every second --------------------------------
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const data = await marketAPI.getTicks(100);
        if (!cancelled) {
          setTicks(data.ticks);
          setTickCount(prev => prev + 1);
        }
      } catch {
        /* ignore */
      }
    };
    pull();
    const id = setInterval(pull, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // -- polling: wallet + trades ------------------------------------------
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
          const isWin = t.status === "won";
          setFlash({
            text: isWin 
              ? `Trade Won! +${formatMoney(t.profit)}` 
              : `Trade Lost ${formatMoney(t.profit)}`,
            kind: t.status,
            profit: t.profit,
            prediction: t.prediction,
            stake: t.stake,
            contract: t.contract_type,
          });
        }
        prevTradeStatus.current[t.id] = t.status;
      }
      setTrades(tradeList);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshWalletAndTrades();
    const id = setInterval(refreshWalletAndTrades, 2000);
    return () => clearInterval(id);
  }, [refreshWalletAndTrades]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 5000);
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
      
      setFlash({
        text: `Trade placed! Waiting for ${durationTicks} ticks...`,
        kind: 'info',
      });
      setTimeout(() => setFlash(null), 3000);
    } catch (err) {
      setError(err.message);
      setFlash({
        text: err.message,
        kind: 'error',
      });
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
  const closedTrades = trades.filter((t) => t.status !== "open").slice(0, 10);

  return (
    <div className="tp-page">
      <style>{styles}</style>

      {flash && (
        <div className={`tp-flash tp-flash--${flash.kind}`} role="status">
          {flash.kind === 'won' && (
            <>
              <div className="tp-flash-icon">
                <i className="bi bi-trophy-fill"></i>
              </div>
              <div className="tp-flash-body">
                <div className="tp-flash-title">
                  <i className="bi bi-check-circle-fill"></i> Trade Won!
                </div>
                <div className="tp-flash-detail">
                  <i className="bi bi-currency-dollar"></i> +{formatMoney(flash.profit)}
                </div>
                <div className="tp-flash-sub">
                  <span><i className="bi bi-tag"></i> {flash.prediction}</span>
                  <span><i className="bi bi-wallet2"></i> Stake: {formatMoney(flash.stake)}</span>
                </div>
              </div>
            </>
          )}
          {flash.kind === 'lost' && (
            <>
              <div className="tp-flash-icon">
                <i className="bi bi-x-circle-fill"></i>
              </div>
              <div className="tp-flash-body">
                <div className="tp-flash-title">
                  <i className="bi bi-x-circle-fill"></i> Trade Lost
                </div>
                <div className="tp-flash-detail">
                  <i className="bi bi-currency-dollar"></i> {formatMoney(flash.profit)}
                </div>
                <div className="tp-flash-sub">
                  <span><i className="bi bi-tag"></i> {flash.prediction}</span>
                  <span><i className="bi bi-wallet2"></i> Stake: {formatMoney(flash.stake)}</span>
                </div>
              </div>
            </>
          )}
          {flash.kind === 'info' && (
            <>
              <div className="tp-flash-icon">
                <i className="bi bi-info-circle-fill"></i>
              </div>
              <div className="tp-flash-body">
                <div className="tp-flash-title">
                  <i className="bi bi-clock-history"></i> Trade Placed
                </div>
                <div className="tp-flash-detail">{flash.text}</div>
              </div>
            </>
          )}
          {flash.kind === 'error' && (
            <>
              <div className="tp-flash-icon">
                <i className="bi bi-exclamation-triangle-fill"></i>
              </div>
              <div className="tp-flash-body">
                <div className="tp-flash-title">
                  <i className="bi bi-x-octagon-fill"></i> Error
                </div>
                <div className="tp-flash-detail">{flash.text}</div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="tp-grid">
        {/* ---------------- Chart + digit readout ---------------- */}
        <section className="tp-panel tp-chart-panel">
          <div className="tp-panel-head">
            <div>
              <span className="tp-eyebrow">
                <i className="bi bi-graph-up"></i> Synthetic Index
              </span>
              <h1 className="tp-title">VOL-100</h1>
            </div>
            <div className="tp-digit-readout">
              <span className="tp-digit-label">
                <i className="bi bi-arrow-counterclockwise"></i> Tick #{tickCount}
              </span>
              <div className="tp-digit-wrapper">
                <span className="tp-digit-label-small">Last digit</span>
                <span
                  className={`tp-digit ${
                    lastTick ? (lastTick.digit % 2 === 0 ? "tp-digit--even" : "tp-digit--odd") : ""
                  }`}
                >
                  {lastTick ? lastTick.digit : "–"}
                </span>
              </div>
            </div>
          </div>

          <PriceChart ticks={ticks} barrier={BARRIER} showBarrier={contractType === "over_under"} />

          <div className="tp-price-row">
            <div className="tp-price-info">
              <span className="tp-price">
                <i className="bi bi-currency-dollar"></i> {lastTick ? formatMoney(lastTick.price) : "—"}
              </span>
              <span className="tp-price-change">
                {ticks.length > 1 && (
                  <>
                    {Number(ticks[ticks.length - 1].price) > Number(ticks[ticks.length - 2].price) ? (
                      <span className="tp-change-up"><i className="bi bi-arrow-up"></i> +{formatMoney(Number(ticks[ticks.length - 1].price) - Number(ticks[ticks.length - 2].price))}</span>
                    ) : (
                      <span className="tp-change-down"><i className="bi bi-arrow-down"></i> {formatMoney(Number(ticks[ticks.length - 1].price) - Number(ticks[ticks.length - 2].price))}</span>
                    )}
                  </>
                )}
              </span>
            </div>
            <span className="tp-price-sub">
              <i className="bi bi-clock"></i> updates every second
            </span>
            <span className="tp-tick-counter">
              <i className="bi bi-arrow-repeat"></i> {ticks.length} ticks
            </span>
          </div>
        </section>

        {/* ---------------- Ticket ---------------- */}
        <section className="tp-panel tp-ticket">
          <div className="tp-wallet-row">
            <span className="tp-eyebrow">
              <i className="bi bi-wallet2"></i> Balance
            </span>
            <span className="tp-balance">
              <i className="bi bi-currency-dollar"></i> {wallet ? formatMoney(wallet.balance) : "—"}
            </span>
          </div>

          <div className="tp-tabs">
            <button
              className={`tp-tab ${contractType === "even_odd" ? "tp-tab--active" : ""}`}
              onClick={() => handleContractType("even_odd")}
            >
              <i className="bi bi-arrow-left-right"></i> Even / Odd
            </button>
            <button
              className={`tp-tab ${contractType === "over_under" ? "tp-tab--active" : ""}`}
              onClick={() => handleContractType("over_under")}
            >
              <i className="bi bi-bar-chart"></i> Over / Under {BARRIER}
            </button>
          </div>

          {contractType === "even_odd" ? (
            <div className="tp-choice-row">
              <button
                className={`tp-choice tp-choice--even ${prediction === "even" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("even")}
              >
                <i className="bi bi-circle"></i> Even
              </button>
              <button
                className={`tp-choice tp-choice--odd ${prediction === "odd" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("odd")}
              >
                <i className="bi bi-circle"></i> Odd
              </button>
            </div>
          ) : (
            <div className="tp-choice-row">
              <button
                className={`tp-choice tp-choice--over ${prediction === "over" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("over")}
              >
                <i className="bi bi-arrow-up"></i> Over {BARRIER}
              </button>
              <button
                className={`tp-choice tp-choice--under ${prediction === "under" ? "tp-choice--active" : ""}`}
                onClick={() => setPrediction("under")}
              >
                <i className="bi bi-arrow-down"></i> Under {BARRIER}
              </button>
            </div>
          )}

          <label className="tp-field-label" htmlFor="tp-stake">
            <i className="bi bi-coin"></i> Stake
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
            <i className="bi bi-clock"></i> Duration (ticks)
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

          {error && <p className="tp-error"><i className="bi bi-exclamation-circle"></i> {error}</p>}

          <button className="tp-submit" onClick={handlePlaceTrade} disabled={placing}>
            {placing ? (
              <><i className="bi bi-hourglass-split"></i> Placing…</>
            ) : (
              <><i className="bi bi-play-fill"></i> Place trade — {formatMoney(stake)}</>
            )}
          </button>
        </section>
      </div>

      {/* ---------------- Positions ---------------- */}
      <section className="tp-panel tp-positions">
        <div className="tp-positions-header">
          <h2 className="tp-section-title">
            <i className="bi bi-list-ul"></i> Open positions
          </h2>
          <span className="tp-positions-count">{openTrades.length} active</span>
        </div>
        {openTrades.length === 0 ? (
          <p className="tp-empty"><i className="bi bi-inbox"></i> No open trades — place one above.</p>
        ) : (
          <TradeTable trades={openTrades} />
        )}

        <div className="tp-positions-header">
          <h2 className="tp-section-title tp-section-title--spaced">
            <i className="bi bi-clock-history"></i> Recent history
          </h2>
          <span className="tp-positions-count">{closedTrades.length} trades</span>
        </div>
        {closedTrades.length === 0 ? (
          <p className="tp-empty"><i className="bi bi-inbox"></i> Settled trades will show up here.</p>
        ) : (
          <TradeTable trades={closedTrades} />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forex-style Price Chart Component
// ---------------------------------------------------------------------------
function PriceChart({ ticks, barrier, showBarrier }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: rect.width || 600,
        height: 260,
      });
    }
  }, []);

  if (ticks.length < 2) {
    return (
      <div className="tp-chart-empty" style={{ height: dimensions.height }}>
        <i className="bi bi-hourglass-split"></i> Loading price feed…
      </div>
    );
  }

  const width = dimensions.width;
  const height = dimensions.height;
  const padding = { top: 20, bottom: 20, left: 40, right: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const prices = ticks.map((t) => Number(t.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  // Generate price levels for grid
  const gridLines = 5;
  const priceLevels = [];
  for (let i = 0; i <= gridLines; i++) {
    priceLevels.push(min + (range * i) / gridLines);
  }

  // Calculate points
  const points = ticks.map((t, i) => {
    const x = padding.left + (i / (ticks.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((Number(t.price) - min) / range) * chartHeight;
    return { x, y, price: Number(t.price), digit: t.digit };
  });

  const last = points[points.length - 1];
  const lastEven = last.digit % 2 === 0;

  // Create path
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Create area fill
  const areaPath = points.map((p, i) => {
    const command = i === 0 ? "M" : "L";
    return `${command}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + ` L${points[points.length - 1].x.toFixed(1)},${height - padding.bottom} L${points[0].x.toFixed(1)},${height - padding.bottom} Z`;

  return (
    <div ref={containerRef} className="tp-chart-container">
      <svg className="tp-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {priceLevels.map((level, i) => {
          const y = padding.top + chartHeight - ((level - min) / range) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                className="tp-grid-line"
              />
              <text x={padding.left - 8} y={y + 4} className="tp-grid-label">
                {level.toFixed(4)}
              </text>
            </g>
          );
        })}

        {/* Barrier line for over/under */}
        {showBarrier && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + chartHeight / 2}
            y2={padding.top + chartHeight / 2}
            className="tp-barrier-line"
          />
        )}

        {/* Area fill */}
        <path d={areaPath} className="tp-chart-area" />

        {/* Main line */}
        <path d={path} className="tp-chart-line" />

        {/* Last price dot */}
        <circle cx={last.x} cy={last.y} r="6" className={`tp-chart-dot ${lastEven ? "tp-chart-dot--even" : "tp-chart-dot--odd"}`} />

        {/* Price labels at last point */}
        <text x={last.x + 12} y={last.y - 10} className="tp-price-label">
          {last.price.toFixed(4)}
        </text>
        <text x={last.x + 12} y={last.y + 6} className={`tp-digit-label-chart ${lastEven ? "tp-digit-label--even" : "tp-digit-label--odd"}`}>
          Digit: {last.digit} {lastEven ? "🔵" : "🟠"}
        </text>

        {/* Current price indicator bar */}
        <line
          x1={last.x}
          y1={padding.top}
          x2={last.x}
          y2={height - padding.bottom}
          className="tp-current-line"
          strokeDasharray="4 4"
        />

        {/* Zero line for barrier */}
        {showBarrier && (
          <text x={width - padding.right - 60} y={padding.top + chartHeight / 2 - 8} className="tp-barrier-label">
            Barrier: {barrier}
          </text>
        )}
      </svg>
    </div>
  );
}

function TradeTable({ trades }) {
  return (
    <div className="tp-table-wrapper">
      <table className="tp-table">
        <thead>
          <tr>
            <th><i className="bi bi-file-text"></i> Contract</th>
            <th><i className="bi bi-bullseye"></i> Prediction</th>
            <th><i className="bi bi-coin"></i> Stake</th>
            <th><i className="bi bi-info-circle"></i> Status</th>
            <th><i className="bi bi-currency-dollar"></i> P/L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td>{t.contract_type === "even_odd" ? "Even/Odd" : `Over/Under ${t.barrier}`}</td>
              <td className="tp-table-pred">{t.prediction}</td>
              <td>{formatMoney(t.stake)}</td>
              <td>
                <span className={`tp-badge tp-badge--${t.status}`}>
                  {t.status === 'open' && <i className="bi bi-circle-fill"></i>}
                  {t.status === 'won' && <i className="bi bi-check-circle-fill"></i>}
                  {t.status === 'lost' && <i className="bi bi-x-circle-fill"></i>}
                  {t.status}
                </span>
              </td>
              <td className={t.profit == null ? "" : Number(t.profit) >= 0 ? "tp-profit-pos" : "tp-profit-neg"}>
                {t.profit == null ? "—" : formatMoney(t.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatMoney(value) {
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = `
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

.tp-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px 64px;
  position: relative;
  background: #0a0e14;
  color: #ffffff;
}

/* Flash Messages */
.tp-flash {
  position: fixed;
  top: 24px;
  right: 24px;
  padding: 20px 24px;
  border-radius: 14px;
  font-family: var(--font-body);
  z-index: 50;
  border: 1px solid var(--border);
  background: rgba(16, 20, 28, 0.95);
  animation: tp-flash-in 0.3s ease-out;
  max-width: 420px;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  backdrop-filter: blur(12px);
}
.tp-flash--won { 
  border-color: #2dd4bf; 
  background: rgba(45, 212, 191, 0.1);
}
.tp-flash--lost { 
  border-color: #f97316; 
  background: rgba(249, 115, 22, 0.1);
}
.tp-flash--info { 
  border-color: #60a5fa; 
  background: rgba(96, 165, 250, 0.1);
}
.tp-flash--error { 
  border-color: #ef4444; 
  background: rgba(239, 68, 68, 0.1);
}

.tp-flash-icon {
  font-size: 32px;
  flex-shrink: 0;
  padding-top: 4px;
}
.tp-flash--won .tp-flash-icon i { color: #2dd4bf; }
.tp-flash--lost .tp-flash-icon i { color: #f97316; }
.tp-flash--info .tp-flash-icon i { color: #60a5fa; }
.tp-flash--error .tp-flash-icon i { color: #ef4444; }

.tp-flash-body {
  flex: 1;
}
.tp-flash-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tp-flash--won .tp-flash-title { color: #2dd4bf; }
.tp-flash--lost .tp-flash-title { color: #f97316; }
.tp-flash--info .tp-flash-title { color: #60a5fa; }
.tp-flash--error .tp-flash-title { color: #ef4444; }

.tp-flash-detail {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}
.tp-flash-sub {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
}
.tp-flash-sub span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tp-flash-sub i {
  font-size: 12px;
}

@keyframes tp-flash-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.tp-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
}
@media (max-width: 860px) {
  .tp-grid { grid-template-columns: 1fr; }
}

.tp-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
}

.tp-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.tp-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
}
.tp-eyebrow i {
  font-size: 14px;
}

.tp-title {
  font-family: var(--font-display);
  font-size: 28px;
  margin: 4px 0 0;
  color: #ffffff;
}

.tp-digit-readout {
  text-align: right;
}
.tp-digit-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  justify-content: flex-end;
}
.tp-digit-label i {
  font-size: 12px;
}
.tp-digit-wrapper {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.tp-digit-label-small {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
}
.tp-digit {
  font-family: var(--font-mono);
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  transition: color 0.2s;
}
.tp-digit--even { color: #2dd4bf; }
.tp-digit--odd { color: #f97316; }

/* Chart Styles */
.tp-chart-container {
  position: relative;
  width: 100%;
}

.tp-chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.4);
  font-family: var(--font-mono);
  font-size: 13px;
  gap: 8px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
}
.tp-chart-empty i {
  font-size: 18px;
}

.tp-chart {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}

.tp-grid-line {
  stroke: rgba(255,255,255,0.05);
  stroke-width: 1;
}

.tp-grid-label {
  fill: rgba(255,255,255,0.3);
  font-size: 10px;
  font-family: var(--font-mono);
}

.tp-chart-area {
  fill: url(#areaGradient);
  opacity: 0.3;
}

.tp-chart-line {
  fill: none;
  stroke: #60a5fa;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tp-chart-dot {
  stroke: #0a0e14;
  stroke-width: 2;
}
.tp-chart-dot--even { fill: #2dd4bf; }
.tp-chart-dot--odd { fill: #f97316; }

.tp-barrier-line {
  stroke: #fbbf24;
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
  opacity: 0.6;
}

.tp-barrier-label {
  fill: #fbbf24;
  font-size: 11px;
  font-family: var(--font-mono);
  opacity: 0.6;
}

.tp-current-line {
  stroke: rgba(255,255,255,0.1);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.tp-price-label {
  fill: #ffffff;
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: 600;
}

.tp-digit-label-chart {
  font-size: 10px;
  font-family: var(--font-mono);
  font-weight: 500;
}
.tp-digit-label--even { fill: #2dd4bf; }
.tp-digit-label--odd { fill: #f97316; }

/* Price Row */
.tp-price-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.tp-price-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tp-price {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ffffff;
}
.tp-price i {
  font-size: 18px;
  color: rgba(255,255,255,0.4);
}
.tp-price-change {
  font-size: 14px;
  font-weight: 600;
}
.tp-change-up {
  color: #2dd4bf;
}
.tp-change-down {
  color: #f97316;
}
.tp-price-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  gap: 4px;
}
.tp-tick-counter {
  margin-left: auto;
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.05);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08);
}

/* Trade Ticket */
.tp-wallet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.tp-balance {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ffffff;
}
.tp-balance i {
  color: #2dd4bf;
  font-size: 18px;
}

.tp-tabs {
  display: flex;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
}
.tp-tab {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.tp-tab i {
  font-size: 14px;
}
.tp-tab--active {
  background: rgba(255,255,255,0.08);
  color: #ffffff;
}

.tp-choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.tp-choice {
  padding: 14px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.7);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.tp-choice i {
  font-size: 16px;
}
.tp-choice--even.tp-choice--active { 
  border-color: #2dd4bf; 
  color: #2dd4bf; 
  background: rgba(45, 212, 191, 0.08);
}
.tp-choice--odd.tp-choice--active { 
  border-color: #f97316; 
  color: #f97316; 
  background: rgba(249, 115, 22, 0.08);
}
.tp-choice--over.tp-choice--active { 
  border-color: #fbbf24; 
  color: #fbbf24; 
  background: rgba(251, 191, 36, 0.08);
}
.tp-choice--under.tp-choice--active { 
  border-color: #60a5fa; 
  color: #60a5fa; 
  background: rgba(96, 165, 250, 0.08);
}

.tp-field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 12px 0 6px;
}
.tp-field-label i {
  font-size: 14px;
}

.tp-input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 16px;
  padding: 10px 12px;
}
.tp-input:focus {
  outline: none;
  border-color: #2dd4bf;
}

.tp-preset-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.tp-preset {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  border-radius: 8px;
  padding: 6px 14px;
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tp-preset:hover {
  border-color: rgba(255,255,255,0.2);
  color: #ffffff;
}
.tp-preset--active {
  border-color: #2dd4bf;
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.08);
}

.tp-error {
  color: #f97316;
  font-size: 13px;
  margin: 10px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tp-error i {
  font-size: 16px;
}

.tp-submit {
  width: 100%;
  margin-top: 18px;
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
.tp-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(45, 212, 191, 0.3);
}
.tp-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Positions */
.tp-positions {
  margin-top: 24px;
}
.tp-positions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 12px;
}
.tp-section-title {
  font-family: var(--font-display);
  font-size: 18px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
}
.tp-section-title i {
  color: rgba(255,255,255,0.4);
  font-size: 16px;
}
.tp-section-title--spaced {
  margin-top: 28px;
}
.tp-positions-count {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.05);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08);
}
.tp-empty {
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tp-empty i {
  font-size: 16px;
}

.tp-table-wrapper {
  overflow-x: auto;
}
.tp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tp-table th {
  text-align: left;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.tp-table th i {
  font-size: 12px;
  margin-right: 4px;
}
.tp-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-family: var(--font-mono);
  color: rgba(255,255,255,0.8);
}
.tp-table-pred {
  text-transform: capitalize;
}

.tp-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: capitalize;
  font-family: var(--font-body);
  font-weight: 600;
}
.tp-badge i {
  font-size: 10px;
}
.tp-badge--open { background: rgba(96,165,250,0.12); color: #60a5fa; }
.tp-badge--won { background: rgba(45,212,191,0.12); color: #2dd4bf; }
.tp-badge--lost { background: rgba(249,115,22,0.12); color: #f97316; }

.tp-profit-pos { color: #2dd4bf; font-weight: 600; }
.tp-profit-neg { color: #f97316; font-weight: 600; }
`;

export { TradePage };