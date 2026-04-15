# Generated manually for tenant isolation (Workspace per account owner).

from django.conf import settings
from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion


def assign_workspaces(apps, schema_editor):
    Workspace = apps.get_model("core", "Workspace")
    User = apps.get_model("auth", "User")
    Project = apps.get_model("core", "Project")
    Team = apps.get_model("core", "Team")
    Member = apps.get_model("core", "Member")
    ServerGroup = apps.get_model("core", "ServerGroup")

    for user in User.objects.iterator():
        Workspace.objects.get_or_create(
            owner_id=user.pk,
            defaults={"name": f"{user.username}'s workspace"},
        )

    primary = Workspace.objects.order_by("id").first()
    if primary is None:
        return

    Project.objects.filter(workspace__isnull=True).update(workspace_id=primary.pk)
    Team.objects.filter(workspace__isnull=True).update(workspace_id=primary.pk)
    Member.objects.filter(workspace__isnull=True).update(workspace_id=primary.pk)

    for sg in ServerGroup.objects.filter(workspace__isnull=True).iterator():
        if sg.project_id:
            p = Project.objects.get(pk=sg.project_id)
            sg.workspace_id = p.workspace_id
        else:
            sg.workspace_id = primary.pk
        sg.save(update_fields=["workspace_id"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0004_member_access_revoked"),
    ]

    operations = [
        migrations.CreateModel(
            name="Workspace",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(blank=True, default="", max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "owner",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sanctum_workspace",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="project",
            name="workspace",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="projects",
                to="core.workspace",
            ),
        ),
        migrations.AddField(
            model_name="team",
            name="workspace",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="teams",
                to="core.workspace",
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="workspace",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="members",
                to="core.workspace",
            ),
        ),
        migrations.AddField(
            model_name="servergroup",
            name="workspace",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="server_groups",
                to="core.workspace",
            ),
        ),
        migrations.RunPython(assign_workspaces, noop_reverse),
        migrations.AlterField(
            model_name="project",
            name="workspace",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="projects",
                to="core.workspace",
            ),
        ),
        migrations.AlterField(
            model_name="team",
            name="workspace",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="teams",
                to="core.workspace",
            ),
        ),
        migrations.AlterField(
            model_name="member",
            name="workspace",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="members",
                to="core.workspace",
            ),
        ),
        migrations.AlterField(
            model_name="servergroup",
            name="workspace",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="server_groups",
                to="core.workspace",
            ),
        ),
        migrations.AlterField(
            model_name="project",
            name="name",
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name="team",
            name="name",
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name="member",
            name="username",
            field=models.CharField(max_length=64),
        ),
        migrations.AddConstraint(
            model_name="project",
            constraint=models.UniqueConstraint(
                fields=("workspace", "name"),
                name="core_project_workspace_name_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="team",
            constraint=models.UniqueConstraint(
                fields=("workspace", "name"),
                name="core_team_workspace_name_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="member",
            constraint=models.UniqueConstraint(
                fields=("workspace", "username"),
                name="core_member_workspace_username_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="servergroup",
            constraint=models.UniqueConstraint(
                condition=Q(project__isnull=True),
                fields=("workspace", "name"),
                name="core_servergroup_workspace_name_ungrouped_uniq",
            ),
        ),
    ]
