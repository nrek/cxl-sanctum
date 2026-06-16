from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_servergroup_supplemental_groups"),
    ]

    operations = [
        migrations.AlterField(
            model_name="servergroup",
            name="supplemental_groups",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    "Existing Linux groups assigned users should belong to on provision "
                    "(customer-defined; Sanctum does not create missing groups by default)."
                ),
            ),
        ),
    ]
