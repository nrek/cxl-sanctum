"""
Default OSS policy: unlimited environments.

Override by setting ``SANCTUM_ENVIRONMENT_POLICY`` to another Python module path
that exports ``check_environment_creation`` and ``get_environment_limit`` with
the same signatures as this module.
"""

from __future__ import annotations


def check_environment_creation(_workspace, *, creating_count: int = 1) -> None:
    """Raise ``rest_framework.exceptions.ValidationError`` if creation should be blocked."""
    pass


def get_environment_limit(_workspace):
    """Return maximum environments for this workspace, or ``None`` for unlimited."""
    return None
