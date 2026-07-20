import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth, authAPI, walletAPI } from "../services/api.js";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(auth.isAuthenticated());
  const [balance, setBalance] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Re-check auth state whenever the route changes (covers login/logout navigations)
  useEffect(() => {
    setIsAuthed(auth.isAuthenticated());
    setMenuOpen(false);
  }, [location.pathname]);

  // Poll balance for logged-in users
  useEffect(() => {
    if (!isAuthed) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    const pull = async () => {
      try {
        const w = await walletAPI.getWallet();
        if (!cancelled) setBalance(w.balance);
      } catch {
        /* ignore transient errors */
      }
    };
    pull();
    const id = setInterval(pull, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthed]);

  function handleLogout() {
    authAPI.logout();
    setIsAuthed(false);
    navigate("/");
  }

  return (
    <header className="nb-header">
      <style>{styles}</style>
      <div className="nb-inner">
        <Link to="/" className="nb-brand">
          <span className="nb-brand-mark">◆</span>
          <span className="nb-brand-name">VoltTrade</span>
        </Link>

        <button
          className="nb-burger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nb-nav ${menuOpen ? "nb-nav--open" : ""}`}>
          <NavLink to="/" end className={({ isActive }) => `nb-link ${isActive ? "nb-link--active" : ""}`}>
            Home
          </NavLink>
          {isAuthed && (
            <>
              <NavLink to="/trade" className={({ isActive }) => `nb-link ${isActive ? "nb-link--active" : ""}`}>
                Trade
              </NavLink>
              <NavLink to="/wallet" className={({ isActive }) => `nb-link ${isActive ? "nb-link--active" : ""}`}>
                Wallet
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => `nb-link ${isActive ? "nb-link--active" : ""}`}>
                Profile
              </NavLink>
            </>
          )}
        </nav>

        <div className={`nb-actions ${menuOpen ? "nb-actions--open" : ""}`}>
          {isAuthed ? (
            <>
              <span className="nb-balance">
                {balance !== null ? `${Number(balance).toFixed(2)} KES` : "…"}
              </span>
              <button className="nb-btn nb-btn--ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nb-btn nb-btn--ghost">
                Log in
              </Link>
              <Link to="/register" className="nb-btn nb-btn--solid">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = `
.nb-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(10, 14, 20, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.nb-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.nb-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
}
.nb-brand-mark {
  color: var(--even);
}

.nb-burger {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  margin-left: auto;
  padding: 6px;
}
.nb-burger span {
  width: 20px;
  height: 2px;
  background: var(--text);
  display: block;
}

.nb-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}
.nb-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
}
.nb-link:hover {
  color: var(--text);
}
.nb-link--active {
  color: var(--text);
  background: var(--surface);
}

.nb-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nb-balance {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--even);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--surface);
}

.nb-btn {
  font-size: 13px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
}
.nb-btn--ghost {
  background: none;
  border-color: var(--border);
  color: var(--text);
}
.nb-btn--solid {
  background: var(--even);
  color: #06110d;
}

@media (max-width: 760px) {
  .nb-burger { display: flex; }
  .nb-nav, .nb-actions {
    display: none;
  }
  .nb-nav--open, .nb-actions--open {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    position: absolute;
    top: 58px;
    left: 0;
    right: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
  }
  .nb-actions--open {
    top: unset;
    position: static;
    border: none;
    padding: 0 20px 16px;
  }
}
`;