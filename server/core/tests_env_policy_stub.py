"""Stub policy for tests: max 6 environments per workspace."""

from rest_framework.exceptions import ValidationError

from .models import ServerGroup

MAX_ENVIRONMENTS = 6


def check_environment_creation(workspace, *, creating_count: int = 1) -> None:
    n = ServerGroup.objects.filter(workspace=workspace).count()
    if n + creating_count > MAX_ENVIRONMENTS:
        raise ValidationError(
            {"detail": "Environment limit reached (stub policy: max 6)."}
        )


def get_environment_limit(_workspace):
    return MAX_ENVIRONMENTS
