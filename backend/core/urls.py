from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Auth
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),

    # Wallet
    path("wallet/", views.WalletView.as_view(), name="wallet"),
    path("transactions/", views.TransactionListView.as_view(), name="transactions"),

    # M-Pesa
    path("payments/mpesa/deposit/", views.MpesaDepositView.as_view(), name="mpesa_deposit"),
    path("payments/mpesa/callback/", views.MpesaCallbackView.as_view(), name="mpesa_callback"),
    path("payments/mpesa/withdraw/", views.MpesaWithdrawView.as_view(), name="mpesa_withdraw"),

    # PayPal
    path("payments/paypal/deposit/", views.PaypalDepositView.as_view(), name="paypal_deposit"),
    path("payments/paypal/deposit/capture/", views.PaypalCaptureView.as_view(), name="paypal_capture"),
    path("payments/paypal/withdraw/", views.PaypalWithdrawView.as_view(), name="paypal_withdraw"),

    # Market data
    path("market/ticks/", views.TicksView.as_view(), name="ticks"),

    # Trading
    path("trades/", views.TradeListView.as_view(), name="trade_list"),
    path("trades/place/", views.PlaceTradeView.as_view(), name="trade_place"),
    path("trades/<uuid:pk>/", views.TradeDetailView.as_view(), name="trade_detail"),
]
