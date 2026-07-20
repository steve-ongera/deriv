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