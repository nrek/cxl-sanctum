import uuid
from django.db import models


class Workspace(models.Model):
    """One workspace per account owner; isolates projects, teams, members, and environments."""

    owner = models.OneToOneField(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="sanctum_workspace",
    )
    name = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or f"Workspace ({self.owner.username})"


class WorkspaceAdmin(models.Model):
    """Django user who can manage the owner's workspace (not billing)."""

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="workspace_admins",
    )
    user = models.OneToOneField(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="workspace_admin_of",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} @ {self.workspace_id}"


class Project(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "name"],
                name="core_project_workspace_name_uniq",
            ),
        ]

    def __str__(self):
        return self.name


class Team(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "name"],
                name="core_team_workspace_name_uniq",
            ),
        ]

    def __str__(self):
        return self.name


class Member(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="members",
    )
    username = models.CharField(max_length=64)
    email = models.EmailField(blank=True, default="")
    teams = models.ManyToManyField(Team, related_name="members", blank=True)
    access_revoked = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Globally revoked: removed from all teams; direct assignments set to removed for convergence.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "username"],
                name="core_member_workspace_username_uniq",
            ),
        ]

    def __str__(self):
        return self.username


class SSHKey(models.Model):
    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="ssh_keys"
    )
    label = models.CharField(max_length=100, blank=True, default="")
    public_key = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "SSH Key"
        verbose_name_plural = "SSH Keys"

    def __str__(self):
        return f"{self.member.username}: {self.label or self.public_key[:40]}"


class ServerGroup(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="server_groups",
    )
    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="server_groups",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    provision_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                name="core_servergroup_project_name_uniq",
            ),
            models.UniqueConstraint(
                fields=["workspace", "name"],
                condition=models.Q(project__isnull=True),
                name="core_servergroup_workspace_name_ungrouped_uniq",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.project_id:
            self.workspace_id = self.project.workspace_id
        super().save(*args, **kwargs)

    def regenerate_token(self):
        self.provision_token = uuid.uuid4()
        self.save(update_fields=["provision_token"])

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.project_id is None:
            if (
                ServerGroup.objects.filter(
                    project__isnull=True,
                    workspace_id=self.workspace_id,
                    name=self.name,
                )
                .exclude(pk=self.pk)
                .exists()
            ):
                raise ValidationError(
                    {"name": "An ungrouped environment with this name already exists."}
                )


class Server(models.Model):
    name = models.CharField(max_length=255)
    hostname = models.CharField(max_length=255, blank=True, default="")
    server_group = models.ForeignKey(
        ServerGroup, on_delete=models.CASCADE, related_name="servers"
    )
    last_seen = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or self.hostname


class Assignment(models.Model):
    """Grant access for either a Team (group of users) or a Member (single user)."""

    ROLE_USER = "user"
    ROLE_SUDO = "sudo"
    ROLE_REMOVED = "removed"
    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_SUDO, "Sudo"),
        (ROLE_REMOVED, "Removed"),
    ]

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="assignments",
        null=True,
        blank=True,
    )
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="direct_assignments",
        null=True,
        blank=True,
    )
    server_group = models.ForeignKey(
        ServerGroup, on_delete=models.CASCADE, related_name="assignments"
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_USER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(team__isnull=False, member__isnull=True)
                    | models.Q(team__isnull=True, member__isnull=False)
                ),
                name="assignment_team_xor_member",
            ),
            models.UniqueConstraint(
                fields=("team", "server_group"),
                condition=models.Q(team__isnull=False),
                name="assignment_unique_team_server_group",
            ),
            models.UniqueConstraint(
                fields=("member", "server_group"),
                condition=models.Q(member__isnull=False),
                name="assignment_unique_member_server_group",
            ),
        ]

    def __str__(self):
        who = self.team.name if self.team_id else self.member.username
        return f"{who} -> {self.server_group.name}: {self.role}"
