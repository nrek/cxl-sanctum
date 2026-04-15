import os

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

User = get_user_model()


def _frontend_base_url():
    return os.environ.get("SANCTUM_FRONTEND_URL", "http://localhost:3000").rstrip("/")


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    email = (request.data.get("email") or "").strip()
    if not username or not password:
        return Response(
            {"detail": "username and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(username=username).exists():
        return Response(
            {"detail": "That username is already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        validate_password(password)
    except DjangoValidationError as e:
        return Response(
            {"detail": " ".join(e.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )
    ws = user.sanctum_workspace
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response(
        {
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or "",
            },
            "workspace": {"id": ws.id, "name": ws.name},
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
    """Issue a fresh token per login (invalidates previous tokens for this user)."""
    serializer = AuthTokenSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data["user"]
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    return Response({"token": token.key})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    """Send a reset link if the email matches a user (always 200 for privacy)."""
    email = (request.data.get("email") or "").strip()
    if not email:
        return Response(
            {"detail": "email is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    users = list(User.objects.filter(email__iexact=email))
    if not users:
        return Response(
            {
                "detail": "If an account exists for that email, password reset instructions were sent."
            }
        )
    base = _frontend_base_url()
    from_email = os.environ.get("SANCTUM_DEFAULT_FROM_EMAIL", "noreply@localhost")
    for user in users:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{base}/reset-password?uid={uid}&token={token}"
        subject = "Reset your SANCTUM password"
        body = (
            f"Hi {user.username},\n\n"
            f"Use this link to set a new password (one-time use):\n{link}\n\n"
            "If you did not request this, you can ignore this email.\n"
        )
        try:
            send_mail(subject, body, from_email, [user.email], fail_silently=True)
        except OSError:
            pass
        if django_settings.DEBUG:
            print(f"[SANCTUM] Password reset link for {user.username}: {link}")
    return Response(
        {
            "detail": "If an account exists for that email, password reset instructions were sent."
        }
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    from django.utils.encoding import force_str
    from django.utils.http import urlsafe_base64_decode

    uid_b64 = request.data.get("uid") or ""
    token = request.data.get("token") or ""
    new_password = request.data.get("new_password") or ""
    if not uid_b64 or not token or not new_password:
        return Response(
            {"detail": "uid, token, and new_password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError):
        return Response(
            {"detail": "Invalid or expired reset link."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not default_token_generator.check_token(user, token):
        return Response(
            {"detail": "Invalid or expired reset link."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response(
            {"detail": " ".join(e.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.set_password(new_password)
    user.save()
    Token.objects.filter(user=user).delete()
    return Response({"detail": "Password updated. Sign in with your new password."})
