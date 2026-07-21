from decimal import Decimal
from random import choice, randint, uniform

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import Wallet, Transaction, Trade

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo data for development"

    def handle(self, *args, **options):

        self.stdout.write(self.style.SUCCESS("Starting database seeding..."))

        demo_users = [
            {
                "username": "admin",
                "email": "admin@example.com",
                "password": "admin123",
                "is_staff": True,
                "is_superuser": True,
                "balance": Decimal("250000.00"),
            },
            {
                "username": "steve",
                "email": "steve@example.com",
                "password": "password123",
                "balance": Decimal("50000.00"),
            },
            {
                "username": "trader1",
                "email": "trader1@example.com",
                "password": "password123",
                "balance": Decimal("10000.00"),
            },
            {
                "username": "trader2",
                "email": "trader2@example.com",
                "password": "password123",
                "balance": Decimal("25000.00"),
            },
        ]

        for data in demo_users:

            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data["email"],
                    "is_staff": data.get("is_staff", False),
                    "is_superuser": data.get("is_superuser", False),
                },
            )

            if created:
                user.set_password(data["password"])
                user.save()

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created user: {user.username}"
                    )
                )

            wallet, _ = Wallet.objects.get_or_create(
                user=user
            )

            wallet.balance = data["balance"]
            wallet.currency = "KES"
            wallet.save()


            # =====================================
            # TRANSACTIONS
            # =====================================

            if not user.transactions.exists():

                for _ in range(10):

                    amount = Decimal(
                        str(round(uniform(100, 5000), 2))
                    )

                    Transaction.objects.create(
                        user=user,

                        type=choice([
                            Transaction.Type.DEPOSIT,
                            Transaction.Type.WITHDRAWAL,
                        ]),

                        method=choice([
                            Transaction.Method.MPESA,
                            Transaction.Method.PAYPAL,
                        ]),

                        amount=amount,

                        status=choice([
                            Transaction.Status.COMPLETED,
                            Transaction.Status.COMPLETED,
                            Transaction.Status.PENDING,
                            Transaction.Status.FAILED,
                        ]),

                        phone_number="254712345678",

                        paypal_email=user.email,

                        mpesa_receipt="QAB123456",

                    )


            # =====================================
            # TRADES
            # =====================================

            if not user.trades.exists():

                for i in range(25):

                    contract_type = choice([
                        Trade.ContractType.EVEN_ODD,
                        Trade.ContractType.OVER_UNDER,
                    ])


                    if contract_type == Trade.ContractType.EVEN_ODD:

                        prediction = choice([
                            Trade.Prediction.EVEN,
                            Trade.Prediction.ODD,
                        ])

                        barrier = None


                    else:

                        prediction = choice([
                            Trade.Prediction.OVER,
                            Trade.Prediction.UNDER,
                        ])

                        barrier = 5



                    status = choice([
                        Trade.Status.WON,
                        Trade.Status.LOST,
                        Trade.Status.OPEN,
                    ])


                    stake = Decimal(
                        str(randint(100, 5000))
                    )


                    # FIXED DECIMAL ERROR HERE
                    if status == Trade.Status.WON:

                        profit = (
                            stake *
                            Decimal("1.95")
                        )


                    elif status == Trade.Status.LOST:

                        profit = -stake


                    else:

                        profit = None



                    Trade.objects.create(

                        user=user,

                        contract_type=contract_type,

                        prediction=prediction,

                        barrier=barrier,


                        stake=stake,

                        payout_multiplier=Decimal("1.95"),

                        duration_ticks=5,


                        entry_tick_index=100000 + i,

                        entry_price=Decimal(
                            str(round(uniform(1000, 5000), 2))
                        ),

                        entry_digit=randint(0, 9),


                        exit_tick_index=(
                            100005 + i
                            if status != Trade.Status.OPEN
                            else None
                        ),


                        exit_price=(
                            Decimal(
                                str(round(uniform(1000, 5000), 2))
                            )
                            if status != Trade.Status.OPEN
                            else None
                        ),


                        exit_digit=(
                            randint(0, 9)
                            if status != Trade.Status.OPEN
                            else None
                        ),


                        status=status,

                        profit=profit,

                    )


        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "================================="
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Database seeded successfully!"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "================================="
            )
        )


        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "Demo Accounts:"
            )
        )

        self.stdout.write(
            "Admin  -> username: admin | password: admin123"
        )

        self.stdout.write(
            "Trader -> username: steve | password: password123"
        )