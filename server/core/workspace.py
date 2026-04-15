from .models import Workspace


def get_request_workspace(request):
    if not request.user.is_authenticated:
        return None
    try:
        return request.user.sanctum_workspace
    except Workspace.DoesNotExist:
        return None
