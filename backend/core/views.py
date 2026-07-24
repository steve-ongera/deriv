
import base64
import hashlib
import time
from datetime import datetime
from decimal import Decimal

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Wallet, Transaction, Trade
from .serializers import (
    RegisterSerializer, UserSerializer, WalletSerializer, TransactionSerializer,
    MpesaDepositSerializer, MpesaWithdrawSerializer,
    PaypalDepositSerializer, PaypalCaptureSerializer, PaypalWithdrawSerializer,
    TradeSerializer, PlaceTradeSerializer,
)
import random
import re

from .serializers import EmailTokenObtainPairSerializer

User = get_user_model()


# ===========================================================================
# TICK ENGINE — deterministic, stateless, no background worker required.
# Every process computes the identical price for a given tick index.
# ===========================================================================
def get_current_tick_index():
    return int(time.time() // settings.TICK_INTERVAL_SECONDS)


def get_tick(index: int):
    """Return (price: Decimal, last_digit: int) for a given tick index."""
    h = hashlib.sha256(f"{settings.TICK_SEED}-{index}".encode()).hexdigest()
    raw = int(h[:8], 16) % 100000          # 5-digit integer, e.g. 82345
    price = Decimal(raw) / Decimal(100)     # e.g. 823.45
    last_digit = raw % 10
    return price, last_digit


def settle_trade(trade: Trade):
    """Settle a trade if it is due. Mutates and saves trade + wallet if settled."""
    if trade.status != Trade.Status.OPEN:
        return trade

    current_index = get_current_tick_index()
    exit_index = trade.entry_tick_index + trade.duration_ticks
    if current_index < exit_index:
        return trade  # not due yet

    exit_price, exit_digit = get_tick(exit_index)

    if trade.contract_type == Trade.ContractType.EVEN_ODD:
        actual = "even" if exit_digit % 2 == 0 else "odd"
        won = actual == trade.prediction
    else:  # over_under
        barrier = trade.barrier if trade.barrier is not None else settings.OVER_UNDER_BARRIER
        if exit_digit == barrier:
            won = False  # push-to-house on exact barrier hit, simplest rule
        elif trade.prediction == "over":
            won = exit_digit > barrier
        else:
            won = exit_digit < barrier

    with db_transaction.atomic():
        wallet = Wallet.objects.select_for_update().get(user=trade.user)
        if won:
            payout = (trade.stake * trade.payout_multiplier).quantize(Decimal("0.01"))
            profit = payout - trade.stake
            wallet.credit(payout)
            trade.status = Trade.Status.WON
        else:
            profit = -trade.stake
            trade.status = Trade.Status.LOST

        trade.exit_tick_index = exit_index
        trade.exit_price = exit_price
        trade.exit_digit = exit_digit
        trade.profit = profit
        trade.settled_at = timezone.now()
        trade.save()

    return trade


def settle_due_trades(user):
    open_trades = Trade.objects.filter(user=user, status=Trade.Status.OPEN)
    for t in open_trades:
        settle_trade(t)


# ===========================================================================
# M-PESA (Safaricom Daraja) helpers
# ===========================================================================
def mpesa_get_access_token():
    resp = requests.get(
        f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
        auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def mpesa_stk_push(phone_number: str, amount: Decimal, account_reference: str):
    token = mpesa_get_access_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
    ).decode()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": "Wallet deposit",
    }
    resp = requests.post(
        f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def mpesa_b2c_payment(phone_number: str, amount: Decimal, remarks: str):
    token = mpesa_get_access_token()
    payload = {
        "InitiatorName": settings.MPESA_INITIATOR_NAME,
        "SecurityCredential": settings.MPESA_INITIATOR_PASSWORD,  # NOTE: must be encrypted with the Daraja public cert in production
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": settings.MPESA_SHORTCODE,
        "PartyB": phone_number,
        "Remarks": remarks,
        "QueueTimeOutURL": settings.MPESA_CALLBACK_URL,
        "ResultURL": settings.MPESA_CALLBACK_URL,
        "Occasion": "Withdrawal",
    }
    resp = requests.post(
        f"{settings.MPESA_BASE_URL}/mpesa/b2c/v1/paymentrequest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# ===========================================================================
# PAYPAL helpers
# ===========================================================================
def paypal_get_access_token():
    resp = requests.post(
        f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token",
        data={"grant_type": "client_credentials"},
        auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def paypal_create_order(amount: Decimal, reference_id: str):
    token = paypal_get_access_token()
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": reference_id,
            "amount": {"currency_code": "USD", "value": str(amount)},
        }],
        "application_context": {
            "return_url": settings.PAYPAL_RETURN_URL,
            "cancel_url": settings.PAYPAL_CANCEL_URL,
        },
    }
    resp = requests.post(
        f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders",
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def paypal_capture_order(order_id: str):
    token = paypal_get_access_token()
    resp = requests.post(
        f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def paypal_create_payout(paypal_email: str, amount: Decimal, sender_batch_id: str):
    token = paypal_get_access_token()
    payload = {
        "sender_batch_header": {
            "sender_batch_id": sender_batch_id,
            "email_subject": "You have a withdrawal payout",
        },
        "items": [{
            "recipient_type": "EMAIL",
            "amount": {"value": str(amount), "currency": "USD"},
            "receiver": paypal_email,
            "note": "Wallet withdrawal",
        }],
    }
    resp = requests.post(
        f"{settings.PAYPAL_BASE_URL}/v1/payments/payouts",
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# ===========================================================================
# AUTH VIEWS
# ===========================================================================
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(TokenObtainPairView):
    """POST {email, password} -> {access, refresh}"""
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]

class UsernameSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        def slugify(s):
            return re.sub(r"[^a-z0-9]", "", (s or "").strip().lower())

        first = slugify(request.query_params.get("first_name"))
        last = slugify(request.query_params.get("last_name"))
        base = slugify(request.query_params.get("base"))

        candidates = []
        if base:
            candidates.append(base)
        if first and last:
            candidates += [f"{first}{last}", f"{first}.{last}", f"{first}_{last}", f"{last}{first}"]
        if first:
            candidates.append(first)
        if last:
            candidates.append(last)
        if not candidates:
            candidates = ["trader"]

        seen, suggestions = set(), []
        for c in candidates:
            if c and c not in seen:
                seen.add(c)
                if not User.objects.filter(username__iexact=c).exists():
                    suggestions.append(c)

        root = candidates[0]
        attempts = 0
        while len(suggestions) < 5 and attempts < 30:
            attempts += 1
            variant = f"{root}{random.randint(1, 999)}"
            if variant in seen:
                continue
            seen.add(variant)
            if not User.objects.filter(username__iexact=variant).exists():
                suggestions.append(variant)

        return Response({"suggestions": suggestions[:5]})
    
    
class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ===========================================================================
# WALLET / TRANSACTIONS
# ===========================================================================
class WalletView(APIView):
    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response(WalletSerializer(wallet).data)


class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


# ===========================================================================
# M-PESA PAYMENT VIEWS
# ===========================================================================
class MpesaDepositView(APIView):
    def post(self, request):
        serializer = MpesaDepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone_number"]
        amount = serializer.validated_data["amount"]

        txn = Transaction.objects.create(
            user=request.user, type=Transaction.Type.DEPOSIT, method=Transaction.Method.MPESA,
            amount=amount, phone_number=phone, status=Transaction.Status.PENDING,
        )
        try:
            result = mpesa_stk_push(phone, amount, account_reference=str(txn.id)[:12])
            txn.checkout_request_id = result.get("CheckoutRequestID")
            txn.merchant_request_id = result.get("MerchantRequestID")
            txn.raw_response = result
            txn.save()
            return Response({"message": "STK push sent. Approve on your phone.", "transaction_id": txn.id})
        except requests.RequestException as exc:
            txn.status = Transaction.Status.FAILED
            txn.raw_response = {"error": str(exc)}
            txn.save()
            return Response({"error": "Failed to initiate M-Pesa STK push."}, status=502)


class MpesaCallbackView(APIView):
    """Public webhook — Safaricom posts the STK push result here."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        body = request.data.get("Body", {})
        stk = body.get("stkCallback", {})
        checkout_id = stk.get("CheckoutRequestID")
        result_code = stk.get("ResultCode")

        txn = Transaction.objects.filter(checkout_request_id=checkout_id).first()
        if not txn:
            return Response({"message": "ignored"})

        txn.raw_response = request.data
        if result_code == 0:
            items = {i["Name"]: i.get("Value") for i in stk.get("CallbackMetadata", {}).get("Item", [])}
            txn.mpesa_receipt = items.get("MpesaReceiptNumber")
            txn.status = Transaction.Status.COMPLETED
            txn.save()
            wallet, _ = Wallet.objects.get_or_create(user=txn.user)
            wallet.credit(txn.amount)
        else:
            txn.status = Transaction.Status.FAILED
            txn.save()

        return Response({"message": "ok"})


class MpesaWithdrawView(APIView):
    def post(self, request):
        serializer = MpesaWithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone_number"]
        amount = serializer.validated_data["amount"]

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        if wallet.balance < amount:
            return Response({"error": "Insufficient balance."}, status=400)

        txn = Transaction.objects.create(
            user=request.user, type=Transaction.Type.WITHDRAWAL, method=Transaction.Method.MPESA,
            amount=amount, phone_number=phone, status=Transaction.Status.PENDING,
        )
        try:
            wallet.debit(amount)  # reserve funds immediately
            result = mpesa_b2c_payment(phone, amount, remarks=f"Withdrawal {txn.id}")
            txn.raw_response = result
            txn.save()
            return Response({"message": "Withdrawal initiated.", "transaction_id": txn.id})
        except requests.RequestException as exc:
            wallet.credit(amount)  # refund on failure to initiate
            txn.status = Transaction.Status.FAILED
            txn.raw_response = {"error": str(exc)}
            txn.save()
            return Response({"error": "Failed to initiate M-Pesa withdrawal."}, status=502)


# ===========================================================================
# PAYPAL PAYMENT VIEWS
# ===========================================================================
class PaypalDepositView(APIView):
    def post(self, request):
        serializer = PaypalDepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]

        txn = Transaction.objects.create(
            user=request.user, type=Transaction.Type.DEPOSIT, method=Transaction.Method.PAYPAL,
            amount=amount, status=Transaction.Status.PENDING,
        )
        try:
            order = paypal_create_order(amount, reference_id=str(txn.id))
            txn.paypal_order_id = order.get("id")
            txn.raw_response = order
            txn.save()
            approval_link = next(
                (l["href"] for l in order.get("links", []) if l.get("rel") == "approve"), None
            )
            return Response({"order_id": order.get("id"), "approval_link": approval_link})
        except requests.RequestException as exc:
            txn.status = Transaction.Status.FAILED
            txn.raw_response = {"error": str(exc)}
            txn.save()
            return Response({"error": "Failed to create PayPal order."}, status=502)


class PaypalCaptureView(APIView):
    def post(self, request):
        serializer = PaypalCaptureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order_id = serializer.validated_data["order_id"]

        txn = Transaction.objects.filter(
            paypal_order_id=order_id, user=request.user, method=Transaction.Method.PAYPAL
        ).first()
        if not txn:
            return Response({"error": "Transaction not found."}, status=404)

        try:
            result = paypal_capture_order(order_id)
            txn.raw_response = result
            if result.get("status") == "COMPLETED":
                txn.status = Transaction.Status.COMPLETED
                txn.save()
                wallet, _ = Wallet.objects.get_or_create(user=request.user)
                wallet.credit(txn.amount)
            else:
                txn.status = Transaction.Status.FAILED
                txn.save()
            return Response({"status": txn.status})
        except requests.RequestException as exc:
            txn.status = Transaction.Status.FAILED
            txn.raw_response = {"error": str(exc)}
            txn.save()
            return Response({"error": "Failed to capture PayPal order."}, status=502)


class PaypalWithdrawView(APIView):
    def post(self, request):
        serializer = PaypalWithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["paypal_email"]
        amount = serializer.validated_data["amount"]

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        if wallet.balance < amount:
            return Response({"error": "Insufficient balance."}, status=400)

        txn = Transaction.objects.create(
            user=request.user, type=Transaction.Type.WITHDRAWAL, method=Transaction.Method.PAYPAL,
            amount=amount, paypal_email=email, status=Transaction.Status.PENDING,
        )
        try:
            wallet.debit(amount)
            result = paypal_create_payout(email, amount, sender_batch_id=str(txn.id))
            txn.paypal_payout_batch_id = result.get("batch_header", {}).get("payout_batch_id")
            txn.status = Transaction.Status.COMPLETED
            txn.raw_response = result
            txn.save()
            return Response({"message": "Payout sent.", "transaction_id": txn.id})
        except requests.RequestException as exc:
            wallet.credit(amount)
            txn.status = Transaction.Status.FAILED
            txn.raw_response = {"error": str(exc)}
            txn.save()
            return Response({"error": "Failed to send PayPal payout."}, status=502)


# ===========================================================================
# MARKET (simulated live ticks)
# ===========================================================================
class TicksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        count = min(int(request.query_params.get("count", 30)), 200)
        current = get_current_tick_index()
        ticks = []
        for i in range(current - count + 1, current + 1):
            price, digit = get_tick(i)
            ticks.append({"index": i, "price": str(price), "digit": digit})
        return Response({"symbol": "VOL-100", "current_tick_index": current, "ticks": ticks})


# ===========================================================================
# TRADING
# ===========================================================================
class PlaceTradeView(APIView):
    def post(self, request):
        serializer = PlaceTradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        if wallet.balance < data["stake"]:
            return Response({"error": "Insufficient balance."}, status=400)

        entry_index = get_current_tick_index()
        entry_price, entry_digit = get_tick(entry_index)
        contract_type = data["contract_type"]
        multiplier = Decimal(str(settings.PAYOUT_MULTIPLIERS[contract_type]))
        barrier = settings.OVER_UNDER_BARRIER if contract_type == Trade.ContractType.OVER_UNDER else None

        with db_transaction.atomic():
            wallet = Wallet.objects.select_for_update().get(user=request.user)
            if wallet.balance < data["stake"]:
                return Response({"error": "Insufficient balance."}, status=400)
            wallet.debit(data["stake"])

            trade = Trade.objects.create(
                user=request.user,
                contract_type=contract_type,
                prediction=data["prediction"],
                barrier=barrier,
                stake=data["stake"],
                payout_multiplier=multiplier,
                duration_ticks=data["duration_ticks"],
                entry_tick_index=entry_index,
                entry_price=entry_price,
                entry_digit=entry_digit,
            )

        return Response(TradeSerializer(trade).data, status=status.HTTP_201_CREATED)


class TradeListView(generics.ListAPIView):
    serializer_class = TradeSerializer

    def get_queryset(self):
        settle_due_trades(self.request.user)
        return Trade.objects.filter(user=self.request.user)


class TradeDetailView(generics.RetrieveAPIView):
    serializer_class = TradeSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user)

    def get_object(self):
        obj = super().get_object()
        return settle_trade(obj)