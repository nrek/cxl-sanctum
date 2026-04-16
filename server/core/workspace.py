from .models import Workspace, WorkspaceAdmin


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
        return None


def is_workspace_owner(request):
    if not request.user.is_authenticated:
        return False
    ws = get_request_workspace(request)
    return ws is not None and ws.owner_id == request.user.id
