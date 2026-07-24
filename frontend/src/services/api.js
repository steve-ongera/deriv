const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------
const ACCESS_KEY = "deriv_clone_access";
const REFRESH_KEY = "deriv_clone_refresh";

export const auth = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isAuthenticated: () => Boolean(localStorage.getItem(ACCESS_KEY)),
};

// ---------------------------------------------------------------------------
// Core request helper — attaches JWT, retries once after a token refresh
// ---------------------------------------------------------------------------
async function request(path, { method = "GET", body, withAuth = true, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = auth.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && withAuth && retry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return request(path, { method, body, withAuth, retry: false });
    auth.clear();
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const message =
      data?.error || data?.detail || data?.message ||
      (typeof data === "object" ? Object.values(data).flat().join(" ") : "Request failed");
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  return data;
}

async function tryRefreshToken() {
  const refresh = auth.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    auth.setTokens(data.access, data.refresh);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authAPI = {
  async register({ username, email, password, first_name, last_name }) {
    return request("/auth/register/", {
      method: "POST",
      withAuth: false,
      body: { username, email, password, first_name, last_name },
    });
  },

  // Login now takes { email, password } instead of { username, password }.
  async login({ email, password }) {
    const data = await request("/auth/login/", {
      method: "POST",
      withAuth: false,
      body: { email, password },
    });
    auth.setTokens(data.access, data.refresh);
    return data;
  },

  logout() {
    auth.clear();
  },

  async me() {
    return request("/auth/me/");
  },

  async updateMe(payload) {
    return request("/auth/me/", { method: "PATCH", body: payload });
  },
};

// ---------------------------------------------------------------------------
// Username suggestions (used live during registration)
// ---------------------------------------------------------------------------
export const usernameAPI = {
  async suggest({ first_name = "", last_name = "", base = "" } = {}) {
    const params = new URLSearchParams({ first_name, last_name, base });
    return request(`/auth/username-suggestions/?${params.toString()}`, { withAuth: false });
  },
};

// ---------------------------------------------------------------------------
// Wallet / transactions
// ---------------------------------------------------------------------------
export const walletAPI = {
  async getWallet() {
    return request("/wallet/");
  },
  async getTransactions() {
    return request("/transactions/");
  },
};

// ---------------------------------------------------------------------------
// Payments — M-Pesa
// ---------------------------------------------------------------------------
export const mpesaAPI = {
  async deposit({ phone_number, amount }) {
    return request("/payments/mpesa/deposit/", { method: "POST", body: { phone_number, amount } });
  },
  async withdraw({ phone_number, amount }) {
    return request("/payments/mpesa/withdraw/", { method: "POST", body: { phone_number, amount } });
  },
};

// ---------------------------------------------------------------------------
// Payments — PayPal
// ---------------------------------------------------------------------------
export const paypalAPI = {
  async deposit({ amount }) {
    return request("/payments/paypal/deposit/", { method: "POST", body: { amount } });
  },
  async capture({ order_id }) {
    return request("/payments/paypal/deposit/capture/", { method: "POST", body: { order_id } });
  },
  async withdraw({ paypal_email, amount }) {
    return request("/payments/paypal/withdraw/", { method: "POST", body: { paypal_email, amount } });
  },
};

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------
export const marketAPI = {
  async getTicks(count = 30) {
    return request(`/market/ticks/?count=${count}`, { withAuth: false });
  },
};

// ---------------------------------------------------------------------------
// Trading
// ---------------------------------------------------------------------------
export const tradesAPI = {
  async placeTrade({ contract_type, prediction, stake, duration_ticks }) {
    return request("/trades/place/", {
      method: "POST",
      body: { contract_type, prediction, stake, duration_ticks },
    });
  },
  async listTrades() {
    return request("/trades/");
  },
  async getTrade(id) {
    return request(`/trades/${id}/`);
  },
};

export default {
  auth,
  authAPI,
  usernameAPI,
  walletAPI,
  mpesaAPI,
  paypalAPI,
  marketAPI,
  tradesAPI,
};