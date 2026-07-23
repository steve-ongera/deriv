import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth, authAPI, walletAPI } from "../services/api.js";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(auth.isAuthenticated());
  const [balance, setBalance] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Re-check auth state whenever the route changes
  useEffect(() => {
    setIsAuthed(auth.isAuthenticated());
    setSidebarOpen(false);
    setDropdownOpen(false);
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
    setSidebarOpen(false);
    setDropdownOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleDropdown() {
    setDropdownOpen(!dropdownOpen);
  }

  return (
    <>
      <header className="nb-header">
        <style>{styles}</style>
        <div className="nb-inner">
          <button
            className="nb-hamburger"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            aria-expanded={sidebarOpen}
          >
            <i className="bi bi-list"></i>
          </button>

          <Link to="/" className="nb-brand">
            SmartTrader
          </Link>

          <nav className="nb-nav">
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
              </>
            )}
          </nav>

          <div className="nb-actions">
            {isAuthed ? (
              <div className="nb-user-menu">
                <div className="nb-user-info" onClick={toggleDropdown}>
                  <span className="nb-balance">
                    {balance !== null ? `${Number(balance).toFixed(2)} KES` : "…"}
                  </span>
                  <div className="nb-avatar">
                    <i className="bi bi-person"></i>
                  </div>
                  <i className={`bi bi-chevron-${dropdownOpen ? 'up' : 'down'} nb-dropdown-arrow`}></i>
                </div>
                
                {dropdownOpen && (
                  <div className="nb-dropdown">
                    <Link to="/profile" className="nb-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <i className="bi bi-person"></i> Profile
                    </Link>
                    <Link to="/wallet" className="nb-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <i className="bi bi-wallet2"></i> Wallet
                    </Link>
                    <div className="nb-dropdown-divider"></div>
                    <button className="nb-dropdown-item nb-dropdown-item--danger" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right"></i> Logout
                    </button>
                  </div>
                )}
              </div>
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

      {/* Sidebar Overlay */}
      <div 
        className={`nb-overlay ${sidebarOpen ? "nb-overlay--open" : ""}`} 
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`nb-sidebar ${sidebarOpen ? "nb-sidebar--open" : ""}`}>
        <div className="nb-sidebar-header">
          <Link to="/" className="nb-sidebar-brand" onClick={closeSidebar}>
            SmartTrader
          </Link>
          <button className="nb-sidebar-close" onClick={closeSidebar}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <nav className="nb-sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nb-sidebar-link ${isActive ? "nb-sidebar-link--active" : ""}`} onClick={closeSidebar}>
            <i className="bi bi-house"></i> Home
          </NavLink>
          
          {isAuthed ? (
            <>
              <NavLink to="/trade" className={({ isActive }) => `nb-sidebar-link ${isActive ? "nb-sidebar-link--active" : ""}`} onClick={closeSidebar}>
                <i className="bi bi-graph-up"></i> Trade
              </NavLink>
              <NavLink to="/wallet" className={({ isActive }) => `nb-sidebar-link ${isActive ? "nb-sidebar-link--active" : ""}`} onClick={closeSidebar}>
                <i className="bi bi-wallet2"></i> Wallet
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => `nb-sidebar-link ${isActive ? "nb-sidebar-link--active" : ""}`} onClick={closeSidebar}>
                <i className="bi bi-person"></i> Profile
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nb-sidebar-link" onClick={closeSidebar}>
                <i className="bi bi-box-arrow-in-right"></i> Log in
              </NavLink>
              <NavLink to="/register" className="nb-sidebar-link" onClick={closeSidebar}>
                <i className="bi bi-person-plus"></i> Sign up
              </NavLink>
            </>
          )}
        </nav>

        {isAuthed && (
          <div className="nb-sidebar-footer">
            <div className="nb-sidebar-balance">
              <span className="nb-sidebar-balance-label">Balance</span>
              <span className="nb-sidebar-balance-value">
                {balance !== null ? `${Number(balance).toFixed(2)} KES` : "…"}
              </span>
            </div>
            <button className="nb-sidebar-logout" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Logout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

const styles = `
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

/* Header */
.nb-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(10, 14, 20, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.nb-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}

/* Hamburger */
.nb-hamburger {
  display: none;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s ease;
}
.nb-hamburger:hover {
  color: #2dd4bf;
}
.nb-hamburger i {
  font-size: 28px;
}

/* Brand */
.nb-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #ffffff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  background: linear-gradient(135deg, #ffffff, #2dd4bf);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Navigation */
.nb-nav {
  display: flex;
  gap: 4px;
  flex: 1;
  margin-left: 8px;
}
.nb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.nb-link:hover {
  color: #ffffff;
  background: rgba(255,255,255,0.05);
}
.nb-link--active {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.08);
}
.nb-link--active:hover {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.12);
}

/* Actions */
.nb-actions {
  display: flex;
  align-items: center;
  gap: 32px;
}

/* User Menu */
.nb-user-menu {
  position: relative;
}
.nb-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px 6px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  transition: all 0.2s ease;
}
.nb-user-info:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
}
.nb-balance {
  font-family: var(--font-mono);
  font-size: 13px;
  color: #2dd4bf;
  font-weight: 600;
}
.nb-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #06110d;
  font-size: 16px;
}
.nb-dropdown-arrow {
  color: rgba(255,255,255,0.3);
  font-size: 12px;
  transition: transform 0.2s ease;
}

/* Dropdown */
.nb-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: #121822;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  animation: dropdownSlide 0.2s ease-out;
}
@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.nb-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
}
.nb-dropdown-item i {
  font-size: 16px;
  width: 20px;
}
.nb-dropdown-item:hover {
  background: rgba(255,255,255,0.05);
  color: #ffffff;
}
.nb-dropdown-item--danger {
  color: #ef4444;
}
.nb-dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}
.nb-dropdown-divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 6px 0;
}

.nb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}
.nb-btn--ghost {
  background: none;
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
.nb-btn--ghost:hover {
  border-color: rgba(255,255,255,0.2);
  color: #ffffff;
}
.nb-btn--solid {
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  color: #06110d;
}
.nb-btn--solid:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(45, 212, 191, 0.3);
}

/* Overlay */
.nb-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 49;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}
.nb-overlay--open {
  opacity: 1;
  visibility: visible;
}

/* Sidebar */
.nb-sidebar {
  position: fixed;
  top: 0;
  left: -320px;
  width: 300px;
  height: 100vh;
  background: #0a0e14;
  border-right: 1px solid rgba(255,255,255,0.06);
  z-index: 50;
  padding: 24px 20px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.nb-sidebar--open {
  left: 0;
}

.nb-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 24px;
}
.nb-sidebar-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #ffffff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  background: linear-gradient(135deg, #ffffff, #2dd4bf);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nb-sidebar-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s ease;
}
.nb-sidebar-close:hover {
  color: #ffffff;
}

.nb-sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nb-sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.nb-sidebar-link i {
  font-size: 20px;
  width: 24px;
  text-align: center;
}
.nb-sidebar-link:hover {
  color: #ffffff;
  background: rgba(255,255,255,0.05);
}
.nb-sidebar-link--active {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.08);
}
.nb-sidebar-link--active:hover {
  background: rgba(45, 212, 191, 0.12);
}

.nb-sidebar-footer {
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 20px;
}
.nb-sidebar-balance {
  background: rgba(45, 212, 191, 0.05);
  border: 1px solid rgba(45, 212, 191, 0.1);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.nb-sidebar-balance-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.4);
  margin-bottom: 2px;
}
.nb-sidebar-balance-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: #2dd4bf;
}
.nb-sidebar-logout {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.05);
  color: #ef4444;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}
.nb-sidebar-logout:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .nb-hamburger {
    display: block;
  }
  
  .nb-nav {
    display: none;
  }
  
  .nb-actions {
    gap: 8px;
  }
  
  .nb-btn {
    padding: 8px 14px;
    font-size: 13px;
  }
  
  .nb-brand {
    font-size: 18px;
  }
  
  .nb-balance {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .nb-inner {
    padding: 12px 16px;
    gap: 12px;
  }
  
  .nb-balance {
    display: none;
  }
  
  .nb-user-info {
    padding: 4px 8px;
  }
  
  .nb-avatar {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  
  .nb-dropdown-arrow {
    display: none;
  }
  
  .nb-sidebar {
    width: 280px;
    left: -280px;
  }
}
`;

export { Navbar };