"""
Default OSS policy: unlimited environments.

Override by setting ``SANCTUM_ENVIRONMENT_POLICY`` to another module that exports
the same functions (see ``billing.sanctum_policy`` in cxl-sanctum-saas).
"""

from __future__ import annotations


def check_environment_creation(_workspace, *, creating_count: int = 1) -> None:
    """Raise ``rest_framework.exceptions.ValidationError`` if creation should be blocked."""
    pass


def get_environment_limit(_workspace):
    """Return maximum environments for this workspace, or ``None`` for unlimited."""
    return None
