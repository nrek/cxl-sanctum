"""Global revoke / restore for members (dashboard vs server convergence)."""

from django.db import transaction

from .models import Assignment, Member


def revoke_member_globally(member: Member) -> None:
    """
    Mark member as globally revoked: remove from all teams and ensure every
    environment they could reach (via teams or direct assignment) has a direct
    member assignment with role=removed so provision scripts emit remove_user.
    """
    if member.access_revoked:
        return

    sg_ids = set()
    for team in member.teams.all():
        for a in Assignment.objects.filter(team=team).only("server_group_id"):
            sg_ids.add(a.server_group_id)
    for a in member.direct_assignments.all().only("server_group_id"):
        sg_ids.add(a.server_group_id)

    with transaction.atomic():
        member.teams.clear()
        for sg_id in sg_ids:
            Assignment.objects.update_or_create(
                member_id=member.id,
                server_group_id=sg_id,
                defaults={
                    "team": None,
                    "role": Assignment.ROLE_REMOVED,
                },
            )
        member.access_revoked = True
        member.save(update_fields=["access_revoked", "updated_at"])


def restore_member_access(member: Member) -> None:
    """Clear global revocation flag and drop all direct member assignments."""
    if not member.access_revoked:
        return

    with transaction.atomic():
        Assignment.objects.filter(member=member, team__isnull=True).delete()
        member.access_revoked = False
        member.save(update_fields=["access_revoked", "updated_at"])
