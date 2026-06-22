from .models import Member, Workspace, WorkspaceAdmin


def get_request_workspace(request):
    if not request.user.is_authenticated:
        return None
    try:
        return request.user.sanctum_workspace
    except Workspace.DoesNotExist:
        pass
    try:
        return request.user.workspace_admin_of.workspace
    except WorkspaceAdmin.DoesNotExist:
        pass
    try:
        return request.user.sanctum_member.workspace
    except Member.DoesNotExist:
        return None


def get_request_member(request):
    if not request.user.is_authenticated:
        return None
    try:
        return request.user.sanctum_member
    except Member.DoesNotExist:
        return None


def get_request_role(request):
    if not request.user.is_authenticated:
        return None
    ws = get_request_workspace(request)
    if ws is None:
        return None
    if ws.owner_id == request.user.id:
        return "owner"
    try:
        request.user.workspace_admin_of
        return "admin"
    except WorkspaceAdmin.DoesNotExist:
        pass
    try:
        request.user.sanctum_member
        return "member"
    except Member.DoesNotExist:
        return None


def is_workspace_owner(request):
    if not request.user.is_authenticated:
        return False
    ws = get_request_workspace(request)
    return ws is not None and ws.owner_id == request.user.id


def is_workspace_admin(request):
    return get_request_role(request) in ("owner", "admin")
