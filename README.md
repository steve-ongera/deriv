# SmartTrader — AI Research Project on Smart Money Concepts

>  **Educational / research use only.** This repository is an academic exploration of
> "smart money" trading concepts (synthetic tick-based markets, digit contracts,
> automated settlement logic, and payment-flow simulation). It is **not** a
> production trading platform, is **not** financial advice, and is **not**
> intended to facilitate real-money gambling or speculative trading.
> See [Disclaimer](#disclaimer) below before using, deploying, or extending this code.

## About this project

SmartTrader is a full-stack simulation built to study how "smart money" —
short-duration, synthetic-index digit contracts (even/odd, over/under) —
can be modeled, priced, and settled deterministically. It was built as an
**AI-assisted research project** to explore:

- Deterministic, stateless "tick engines" for generating reproducible synthetic
  price/digit sequences without a live market feed or background workers.
- Contract design and payout logic for even/odd and over/under digit contracts.
- Wallet, transaction, and settlement flows modeled after real payment rails
  (M-Pesa STK Push/B2C, PayPal Orders/Payouts) in a sandboxed, non-production context.
- End-to-end authentication, wallet, and trading UX patterns in a modern
  React + Django REST stack.

The "market" in this project is entirely synthetic: prices are derived from a
SHA-256 hash of a fixed seed and a time-based tick index, **not** from any real
exchange, broker, or financial data provider. No real trades are placed on any
real market, and any resemblance to a specific commercial trading platform is
incidental to the research goal of studying the mechanics involved.

## Disclaimer

- This project is provided **strictly for educational, academic, and research
  purposes**. It exists to study system design, contract/settlement logic, and
  payment integration patterns — not to encourage real-money trading or gambling.
- **Do not deploy this project to accept real deposits, real withdrawals, or
  real money from members of the public.** The M-Pesa and PayPal integrations
  included here are reference implementations meant to be run against sandbox
  credentials only.
- Nothing in this repository constitutes financial, investment, or trading
  advice. Digit contracts of this kind carry a high risk of loss and this
  project is not evidence of, or a guide to, profitability.
- Trading and gambling-like products are regulated in most jurisdictions.
  Anyone adapting this code for a real-world purpose is solely responsible for
  understanding and complying with the laws, licensing requirements, and
  consumer-protection regulations that apply to them.
- The authors/contributors accept no liability for any financial loss, legal
  exposure, or other damages arising from use of this code outside of a
  research or educational context.

## Project structure

```
deriv-clone/
├── README.md
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── core/                      # Django project (settings/urls only)
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py                # main url
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── api/                       # the ONE app
│       ├── __init__.py
│       ├── apps.py
│       ├── models.py              # Wallet, Transaction, Trade
│       ├── serializers.py
│       ├── views.py                # auth, wallet, mpesa, paypal, market, trades
│       ├── urls.py                # app url
│       └── migrations/
│           └── __init__.py
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                 # all routes
        ├── services/
        │   └── api.js               # all API endpoint calls
        ├── components/
        │   ├── Navbar.jsx
        │   └── Footer.jsx
        └── pages/
            ├── HomePage.jsx
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── ProfilePage.jsx
            ├── WalletPage.jsx        # deposit/withdraw mpesa + paypal
            └── TradePage.jsx         # live chart + even/odd + over/under
```

## Tech stack

**Backend**
- Django + Django REST Framework
- Simple JWT for authentication (email + password login)
- Deterministic tick engine (SHA-256-based synthetic price/digit generator)
- M-Pesa Daraja (STK Push / B2C) and PayPal (Orders / Payouts) integrations —
  intended for sandbox use

**Frontend**
- React (Vite)
- React Router
- Fetch-based API client with JWT access/refresh handling

## Getting started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in sandbox credentials only
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

By default the frontend expects the API at `http://127.0.0.1:8000/api`
(configurable via `VITE_API_BASE_URL`).

## Environment variables

See `backend/.env.example` for the full list. At minimum you'll need:

- `SECRET_KEY` — Django secret key
- `MPESA_*` — Safaricom Daraja **sandbox** consumer key/secret, shortcode, passkey
- `PAYPAL_*` — PayPal **sandbox** client ID/secret
- Database and CORS-related settings as applicable to your environment

**Never use live/production payment credentials with this codebase.** It has
not been security-audited or hardened for handling real customer funds.

## Core concepts modeled

| Concept | Where it lives |
|---|---|
| Deterministic synthetic tick/price generator | `api/views.py` (`get_tick`, `get_current_tick_index`) |
| Even/odd and over/under digit contracts | `api/models.py` (`Trade`), `api/serializers.py` (`PlaceTradeSerializer`) |
| Stateless settlement (no background worker required) | `api/views.py` (`settle_trade`, `settle_due_trades`) |
| Wallet balance management | `api/models.py` (`Wallet`) |
| Sandbox payment flow simulation | `api/views.py` (M-Pesa / PayPal helper functions and views) |
| JWT auth (email-based login) | `api/serializers.py`, `api/views.py` (`LoginView`) |

## License / usage terms

This project is shared for learning and research purposes. If you fork or
reuse this code, please retain this disclaimer and continue to use it
responsibly — for study, prototyping, and portfolio/demo purposes rather than
as a real trading or gambling product.

## Contributing

This is a research/learning project. Issues and PRs that improve the
educational value of the code (clearer documentation, better test coverage,
more realistic sandboxed integrations, security best practices) are welcome.