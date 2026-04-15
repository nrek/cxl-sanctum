"""Load pluggable environment (ServerGroup) quota policy from Django settings."""

from __future__ import annotations

import importlib

from django.conf import settings


def get_policy_module():
    path = getattr(
        settings,
        "SANCTUM_ENVIRONMENT_POLICY",
        "core.default_environment_policy",
    )
    return importlib.import_module(path)


def check_environment_creation(workspace, *, creating_count: int = 1) -> None:
    get_policy_module().check_environment_creation(
        workspace, creating_count=creating_count
    )


def get_environment_limit(workspace):
    return get_policy_module().get_environment_limit(workspace)
