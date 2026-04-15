from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="project")
router.register(r"teams", views.TeamViewSet, basename="team")
router.register(r"members", views.MemberViewSet, basename="member")
router.register(r"server-groups", views.ServerGroupViewSet, basename="servergroup")
router.register(r"servers", views.ServerViewSet, basename="server")
router.register(r"assignments", views.AssignmentViewSet, basename="assignment")

urlpatterns = [
    path("", include(router.urls)),
    path("provision/<uuid:token>/", views.provision_view, name="provision"),
    path("heartbeat/<uuid:token>/", views.heartbeat_view, name="heartbeat"),
    path("stats/", views.dashboard_stats, name="dashboard-stats"),
    path("workspace/", views.workspace_summary, name="workspace-summary"),
]
