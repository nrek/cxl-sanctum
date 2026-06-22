"""DRF permission classes for workspace access."""

from rest_framework import permissions

from .workspace import get_request_role, is_workspace_admin, is_workspace_owner


class IsWorkspaceOwner(permissions.BasePermission):
    """Only the workspace account owner (not workspace admins)."""

    def has_permission(self, request, view):
        return is_workspace_owner(request)


class IsWorkspaceAdmin(permissions.BasePermission):
    """Workspace owner or workspace admin; excludes member dashboard users."""

    def has_permission(self, request, view):
        return is_workspace_admin(request)


class IsWorkspaceMember(permissions.BasePermission):
    """Any authenticated account mapped to a workspace."""

    def has_permission(self, request, view):
        return get_request_role(request) in ("owner", "admin", "member")


class ReadOnlyForMember(permissions.BasePermission):
    """Allow members to read, but reserve mutations for admins."""

    def has_permission(self, request, view):
        role = get_request_role(request)
        if role in ("owner", "admin"):
            return True
        if role == "member":
            return request.method in permissions.SAFE_METHODS
        return False
