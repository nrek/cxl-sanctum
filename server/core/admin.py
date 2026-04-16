from django.contrib import admin
from .models import (
    Workspace,
    WorkspaceAdmin,
    Project,
    Team,
    Member,
    SSHKey,
    ServerGroup,
    Server,
    Assignment,
)


@admin.register(Workspace)
class WorkspaceModelAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__username")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "environment_count", "created_at")
    search_fields = ("name",)

    def environment_count(self, obj):
        return obj.server_groups.count()


class SSHKeyInline(admin.TabularInline):
    model = SSHKey
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "member_count", "created_at")
    search_fields = ("name",)

    def member_count(self, obj):
        return obj.members.count()


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "access_revoked", "key_count", "created_at")
    search_fields = ("username", "email")
    filter_horizontal = ("teams",)
    inlines = [SSHKeyInline]

    def key_count(self, obj):
        return obj.ssh_keys.count()


@admin.register(SSHKey)
class SSHKeyAdmin(admin.ModelAdmin):
    list_display = ("member", "label", "created_at")
    search_fields = ("member__username", "label")


@admin.register(ServerGroup)
class ServerGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "provision_token", "server_count", "created_at")
    list_filter = ("project",)
    readonly_fields = ("provision_token",)

    def server_count(self, obj):
        return obj.servers.count()


@admin.register(Server)
class ServerAdmin(admin.ModelAdmin):
    list_display = ("name", "hostname", "server_group", "last_seen", "ip_address")
    list_filter = ("server_group",)
    search_fields = ("name", "hostname")


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("team", "member", "server_group", "role", "updated_at")
    list_filter = ("role", "server_group")


@admin.register(WorkspaceAdmin)
class WorkspaceAdminAccountAdmin(admin.ModelAdmin):
    list_display = ("user", "workspace", "created_at")
    search_fields = ("user__username", "workspace__name")
