"""
Django settings for the Deriv-clone project.
Single app ('api'). Run with: python manage.py runserver
"""
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="dev-secret-key-change-me")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost", cast=Csv())

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",

    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"
ASGI_APPLICATION = "backend.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    #{"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# DRF / JWT
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=6),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173",
    cast=Csv(),
)

# ---------------------------------------------------------------------------
# M-Pesa Daraja
# ---------------------------------------------------------------------------
MPESA_ENV = config("MPESA_ENV", default="sandbox")
MPESA_BASE_URL = (
    "https://sandbox.safaricom.co.ke" if MPESA_ENV == "sandbox"
    else "https://api.safaricom.co.ke"
)
MPESA_CONSUMER_KEY = config("MPESA_CONSUMER_KEY", default="")
MPESA_CONSUMER_SECRET = config("MPESA_CONSUMER_SECRET", default="")
MPESA_SHORTCODE = config("MPESA_SHORTCODE", default="174379")
MPESA_PASSKEY = config("MPESA_PASSKEY", default="")
MPESA_CALLBACK_URL = config("MPESA_CALLBACK_URL", default="")
MPESA_INITIATOR_NAME = config("MPESA_INITIATOR_NAME", default="testapi")
MPESA_INITIATOR_PASSWORD = config("MPESA_INITIATOR_PASSWORD", default="")

# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------
PAYPAL_ENV = config("PAYPAL_ENV", default="sandbox")
PAYPAL_BASE_URL = (
    "https://api-m.sandbox.paypal.com" if PAYPAL_ENV == "sandbox"
    else "https://api-m.paypal.com"
)
PAYPAL_CLIENT_ID = config("PAYPAL_CLIENT_ID", default="")
PAYPAL_CLIENT_SECRET = config("PAYPAL_CLIENT_SECRET", default="")
PAYPAL_RETURN_URL = config("PAYPAL_RETURN_URL", default="http://localhost:5173/wallet?paypal=success")
PAYPAL_CANCEL_URL = config("PAYPAL_CANCEL_URL", default="http://localhost:5173/wallet?paypal=cancel")

# ---------------------------------------------------------------------------
# Trading engine (deterministic simulated ticks, no background worker needed)
# ---------------------------------------------------------------------------
TICK_SEED = config("TICK_SEED", default="deriv-clone-v1")
TICK_INTERVAL_SECONDS = 1          # one simulated tick per second
DEFAULT_TRADE_DURATION_TICKS = 5   # how many ticks a contract runs for
OVER_UNDER_BARRIER = 5             # digit barrier for over/under contracts

PAYOUT_MULTIPLIERS = {
    "even_odd": 1.95,
    "over_under": 1.90,
}

MIN_STAKE = 10       # in wallet currency (KES)
MAX_STAKE = 50000