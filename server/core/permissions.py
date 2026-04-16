"""DRF permission classes for workspace access."""

from rest_framework import permissions

from .workspace import is_workspace_owner


class IsWorkspaceOwner(permissions.BasePermission):
    """Only the workspace account owner (not workspace admins)."""

    def has_permission(self, request, view):
        return is_workspace_owner(request)
