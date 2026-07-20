import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Wallet(models.Model):
    """One wallet per user. Created automatically on registration (see signal below)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet"
    )
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} wallet — {self.balance} {self.currency}"

    def credit(self, amount):
        self.balance += amount
        self.save(update_fields=["balance", "updated_at"])

    def debit(self, amount):
        self.balance -= amount
        self.save(update_fields=["balance", "updated_at"])


class Transaction(models.Model):
    """Deposits and withdrawals via M-Pesa or PayPal."""

    class Type(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"

    class Method(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        PAYPAL = "paypal", "PayPal"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions"
    )
    type = models.CharField(max_length=10, choices=Type.choices)
    method = models.CharField(max_length=10, choices=Method.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(1)])
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    # M-Pesa specific
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)
    mpesa_receipt = models.CharField(max_length=50, blank=True, null=True)

    # PayPal specific
    paypal_order_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    paypal_payout_batch_id = models.CharField(max_length=100, blank=True, null=True)
    paypal_email = models.EmailField(blank=True, null=True)

    raw_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type}/{self.method} {self.amount} ({self.status}) - {self.user.username}"


class Trade(models.Model):
    """A single digit-contract trade: even/odd or over/under."""

    class ContractType(models.TextChoices):
        EVEN_ODD = "even_odd", "Even/Odd"
        OVER_UNDER = "over_under", "Over/Under"

    class Prediction(models.TextChoices):
        EVEN = "even", "Even"
        ODD = "odd", "Odd"
        OVER = "over", "Over"
        UNDER = "under", "Under"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trades"
    )
    contract_type = models.CharField(max_length=12, choices=ContractType.choices)
    prediction = models.CharField(max_length=6, choices=Prediction.choices)
    barrier = models.IntegerField(blank=True, null=True)  # only used for over_under

    stake = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(1)])
    payout_multiplier = models.DecimalField(max_digits=5, decimal_places=2)
    duration_ticks = models.PositiveIntegerField()

    entry_tick_index = models.BigIntegerField()
    entry_price = models.DecimalField(max_digits=12, decimal_places=2)
    entry_digit = models.PositiveSmallIntegerField()

    exit_tick_index = models.BigIntegerField(blank=True, null=True)
    exit_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    exit_digit = models.PositiveSmallIntegerField(blank=True, null=True)

    status = models.CharField(max_length=6, choices=Status.choices, default=Status.OPEN)
    profit = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    settled_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contract_type}:{self.prediction} stake={self.stake} status={self.status}"