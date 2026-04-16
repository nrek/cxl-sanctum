from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_workspace_for_new_user(sender, instance, created, **kwargs):
    if not created:
        return
    if getattr(instance, "_skip_workspace_creation", False):
        return
    from .models import Workspace

    Workspace.objects.get_or_create(
        owner=instance,
        defaults={"name": f"{instance.username}'s workspace"},
    )
