from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0009_alter_servergroup_supplemental_groups"),
    ]

    operations = [
        migrations.AddField(
            model_name="member",
            name="user",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sanctum_member",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="project",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name="AccessRequest",
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
                (
                    "kind",
                    models.CharField(
                        choices=[("access", "Access"), ("key", "Key")],
                        max_length=12,
                    ),
                ),
                (
                    "role_requested",
                    models.CharField(
                        blank=True,
                        choices=[("user", "User"), ("sudo", "Sudo")],
                        default="user",
                        max_length=10,
                    ),
                ),
                ("key_label", models.CharField(blank=True, default="", max_length=100)),
                ("algorithm", models.CharField(blank=True, default="ed25519", max_length=32)),
                ("note", models.TextField(blank=True, default="")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("denied", "Denied"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=12,
                    ),
                ),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("admin_note", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_requests",
                        to="core.member",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_requests",
                        to="core.project",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_access_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "server",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_requests",
                        to="core.server",
                    ),
                ),
                (
                    "server_group",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_requests",
                        to="core.servergroup",
                    ),
                ),
                (
                    "team",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_requests",
                        to="core.team",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="access_requests",
                        to="core.workspace",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["workspace", "status", "created_at"],
                        name="core_access_workspa_841139_idx",
                    ),
                ],
            },
        ),
    ]
