from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Wallet, Transaction, Trade

User = get_user_model()

from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Authenticate with {email, password} instead of {username, password}."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)  # drop the default "username" field
        self.fields["email"] = serializers.EmailField()

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip()
        password = attrs.get("password")

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed("No active account found with the given credentials")

        user = authenticate(
            request=self.context.get("request"),
            username=user_obj.get_username(),
            password=password,
        )
        if user is None:
            raise AuthenticationFailed("No active account found with the given credentials")

        refresh = self.get_token(user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}

# ---------------------------------------------------------------------------
# Auth / user
# ---------------------------------------------------------------------------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "phone_number", "first_name", "last_name"]

    def create(self, validated_data):
        validated_data.pop("phone_number", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        Wallet.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "date_joined"]
        read_only_fields = ["id", "username", "date_joined"]


# ---------------------------------------------------------------------------
# Wallet / transactions
# ---------------------------------------------------------------------------
class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ["balance", "currency", "updated_at"]


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id", "type", "method", "amount", "status",
            "phone_number", "mpesa_receipt",
            "paypal_order_id", "paypal_email",
            "created_at", "updated_at",
        ]
        read_only_fields = fields


class MpesaDepositSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        r"^2547\d{8}$|^2541\d{8}$",
        error_messages={"invalid": "Phone number must be in the format 2547XXXXXXXX"},
    )
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1"))


class MpesaWithdrawSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(r"^2547\d{8}$|^2541\d{8}$")
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("10"))


class PaypalDepositSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1"))


class PaypalCaptureSerializer(serializers.Serializer):
    order_id = serializers.CharField()


class PaypalWithdrawSerializer(serializers.Serializer):
    paypal_email = serializers.EmailField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1"))


# ---------------------------------------------------------------------------
# Trading
# ---------------------------------------------------------------------------
class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = [
            "id", "contract_type", "prediction", "barrier",
            "stake", "payout_multiplier", "duration_ticks",
            "entry_tick_index", "entry_price", "entry_digit",
            "exit_tick_index", "exit_price", "exit_digit",
            "status", "profit", "created_at", "settled_at",
        ]
        read_only_fields = fields


class PlaceTradeSerializer(serializers.Serializer):
    contract_type = serializers.ChoiceField(choices=Trade.ContractType.choices)
    prediction = serializers.ChoiceField(choices=Trade.Prediction.choices)
    stake = serializers.DecimalField(
        max_digits=14, decimal_places=2,
        min_value=Decimal(settings.MIN_STAKE), max_value=Decimal(settings.MAX_STAKE),
    )
    duration_ticks = serializers.IntegerField(
        required=False, min_value=1, max_value=60,
        default=settings.DEFAULT_TRADE_DURATION_TICKS,
    )

    def validate(self, attrs):
        contract_type = attrs["contract_type"]
        prediction = attrs["prediction"]

        if contract_type == Trade.ContractType.EVEN_ODD:
            if prediction not in (Trade.Prediction.EVEN, Trade.Prediction.ODD):
                raise serializers.ValidationError(
                    "For even_odd contracts, prediction must be 'even' or 'odd'."
                )
        elif contract_type == Trade.ContractType.OVER_UNDER:
            if prediction not in (Trade.Prediction.OVER, Trade.Prediction.UNDER):
                raise serializers.ValidationError(
                    "For over_under contracts, prediction must be 'over' or 'under'."
                )
        return attrs