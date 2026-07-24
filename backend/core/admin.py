from django.contrib import admin
from django.utils.html import format_html

from .models import Wallet, Transaction, Trade


# ===========================================================================
# WALLET
# ===========================================================================
@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "currency", "updated_at")
    list_select_related = ("user",)
    search_fields = ("user__username", "user__email", "user__first_name", "user__last_name")
    list_filter = ("currency",)
    readonly_fields = ("updated_at",)
    ordering = ("-updated_at",)
    autocomplete_fields = ("user",)

    fieldsets = (
        (None, {"fields": ("user", "balance", "currency")}),
        ("Meta", {"fields": ("updated_at",)}),
    )

    @admin.action(description="Credit selected wallets by a fixed test amount (KES 100)")
    def credit_test_amount(self, request, queryset):
        for wallet in queryset:
            wallet.credit(100)
        self.message_user(request, f"Credited {queryset.count()} wallet(s).")

    actions = ["credit_test_amount"]


# ===========================================================================
# TRANSACTION
# ===========================================================================
STATUS_COLORS = {
    "pending": "#f59e0b",
    "completed": "#22c55e",
    "failed": "#ef4444",
    "cancelled": "#6b7280",
}


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "short_id",
        "user",
        "type",
        "method",
        "amount",
        "status_badge",
        "reference",
        "created_at",
    )
    list_select_related = ("user",)
    list_filter = ("type", "method", "status", "created_at")
    search_fields = (
        "id",
        "user__username",
        "user__email",
        "phone_number",
        "mpesa_receipt",
        "checkout_request_id",
        "merchant_request_id",
        "paypal_order_id",
        "paypal_payout_batch_id",
        "paypal_email",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    autocomplete_fields = ("user",)
    readonly_fields = ("id", "created_at", "updated_at", "raw_response_pretty")

    fieldsets = (
        (None, {"fields": ("id", "user", "type", "method", "amount", "status")}),
        ("M-Pesa", {
            "classes": ("collapse",),
            "fields": ("phone_number", "checkout_request_id", "merchant_request_id", "mpesa_receipt"),
        }),
        ("PayPal", {
            "classes": ("collapse",),
            "fields": ("paypal_order_id", "paypal_payout_batch_id", "paypal_email"),
        }),
        ("Raw response", {"classes": ("collapse",), "fields": ("raw_response_pretty",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="ID")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = STATUS_COLORS.get(obj.status, "#6b7280")
        return format_html(
            '<span style="padding:2px 8px;border-radius:999px;font-size:11px;'
            'font-weight:600;color:#fff;background:{}">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Reference")
    def reference(self, obj):
        if obj.method == Transaction.Method.MPESA:
            return obj.mpesa_receipt or obj.checkout_request_id or "—"
        return obj.paypal_order_id or obj.paypal_payout_batch_id or "—"

    @admin.display(description="Raw response")
    def raw_response_pretty(self, obj):
        if not obj.raw_response:
            return "—"
        import json
        return format_html("<pre>{}</pre>", json.dumps(obj.raw_response, indent=2))

    @admin.action(description="Mark selected transactions as completed")
    def mark_completed(self, request, queryset):
        updated = queryset.update(status=Transaction.Status.COMPLETED)
        self.message_user(request, f"Marked {updated} transaction(s) as completed.")

    @admin.action(description="Mark selected transactions as failed")
    def mark_failed(self, request, queryset):
        updated = queryset.update(status=Transaction.Status.FAILED)
        self.message_user(request, f"Marked {updated} transaction(s) as failed.")

    actions = ["mark_completed", "mark_failed"]


# ===========================================================================
# TRADE
# ===========================================================================
@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = (
        "short_id",
        "user",
        "contract_type",
        "prediction",
        "barrier",
        "stake",
        "payout_multiplier",
        "status_badge",
        "profit_display",
        "created_at",
    )
    list_select_related = ("user",)
    list_filter = ("contract_type", "prediction", "status", "created_at")
    search_fields = ("id", "user__username", "user__email")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    autocomplete_fields = ("user",)
    readonly_fields = (
        "id",
        "entry_tick_index", "entry_price", "entry_digit",
        "exit_tick_index", "exit_price", "exit_digit",
        "profit", "created_at", "settled_at",
    )

    fieldsets = (
        (None, {
            "fields": (
                "id", "user", "contract_type", "prediction", "barrier",
                "stake", "payout_multiplier", "duration_ticks", "status",
            )
        }),
        ("Entry", {"fields": ("entry_tick_index", "entry_price", "entry_digit")}),
        ("Exit", {"fields": ("exit_tick_index", "exit_price", "exit_digit", "profit")}),
        ("Timestamps", {"fields": ("created_at", "settled_at")}),
    )

    @admin.display(description="ID")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {"open": "#3b82f6", "won": "#22c55e", "lost": "#ef4444"}
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="padding:2px 8px;border-radius:999px;font-size:11px;'
            'font-weight:600;color:#fff;background:{}">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Profit")
    def profit_display(self, obj):
        if obj.profit is None:
            return "—"
        color = "#22c55e" if obj.profit >= 0 else "#ef4444"
        sign = "+" if obj.profit >= 0 else ""
        return format_html('<span style="color:{}">{}{}</span>', color, sign, obj.profit)

    def has_add_permission(self, request):
        # Trades are placed via the API's tick engine; creating them by hand
        # in the admin would skip wallet debits and settlement logic.
        return False