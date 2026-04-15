from django.contrib import admin
from django.urls import path, include

from core import auth_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/auth/login/", auth_views.login, name="api-login"),
    path("api/auth/register/", auth_views.register, name="api-register"),
    path("api/auth/logout/", auth_views.logout, name="api-logout"),
    path(
        "api/auth/password-reset/",
        auth_views.password_reset_request,
        name="api-password-reset",
    ),
    path(
        "api/auth/password-reset/confirm/",
        auth_views.password_reset_confirm,
        name="api-password-reset-confirm",
    ),
]
