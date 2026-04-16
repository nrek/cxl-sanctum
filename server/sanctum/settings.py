import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env.local first (local overrides), then .env (shared defaults)
load_dotenv(BASE_DIR / ".env.local", override=True)
load_dotenv(BASE_DIR / ".env", override=False)

SECRET_KEY = os.environ.get(
    "SANCTUM_SECRET_KEY",
    "django-insecure-change-me-in-production",
)

DEBUG = os.environ.get("SANCTUM_DEBUG", "true").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get("SANCTUM_ALLOWED_HOSTS", "*").split(",")

# When behind a TLS-terminating reverse proxy (Apache, nginx, etc.),
# trust X-Forwarded-Proto so build_absolute_uri() returns https:// URLs.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "core.apps.CoreConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "sanctum.urls"

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

WSGI_APPLICATION = "sanctum.wsgi.application"

# Database: SQLite by default, PostgreSQL via env vars
if os.environ.get("SANCTUM_DB_ENGINE") == "postgresql":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("SANCTUM_DB_NAME", "sanctum"),
            "USER": os.environ.get("SANCTUM_DB_USER", "sanctum"),
            "PASSWORD": os.environ.get("SANCTUM_DB_PASSWORD", ""),
            "HOST": os.environ.get("SANCTUM_DB_HOST", "localhost"),
            "PORT": os.environ.get("SANCTUM_DB_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# CORS
# In debug mode, allow localhost on ports 3000-3010 automatically so local
# dev "just works" regardless of which port Next.js picks.
_cors_env = os.environ.get("SANCTUM_CORS_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        f"http://localhost:{p}" for p in range(3000, 3011)
    ]
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(CORS_ALLOWED_ORIGINS))
CORS_ALLOW_CREDENTIALS = True

# Pluggable module path: must export ``check_environment_creation`` and
# ``get_environment_limit``. Default OSS build = unlimited environments.
SANCTUM_ENVIRONMENT_POLICY = os.environ.get(
    "SANCTUM_ENVIRONMENT_POLICY",
    "core.default_environment_policy",
)

# "self_hosted" | "hosted" — informational for API clients (optional deployments may set hosted).
SANCTUM_DEPLOYMENT_MODE = os.environ.get("SANCTUM_DEPLOYMENT_MODE", "self_hosted")
