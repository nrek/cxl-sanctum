from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_serverheartbeatlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="servergroup",
            name="supplemental_groups",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
