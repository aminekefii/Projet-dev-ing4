from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from accounts.models import ADMIN, STUDENT, User

# The demo accounts from frontend/README.md. The frontend's mock data (enrolments,
# progress, vouchers) is attached to these emails. Dev only: the passwords are weak.
DEMO_USERS = [
    {'email': 'user1@tek-up.de', 'password': '123456789', 'first_name': 'User', 'last_name': 'One', 'role': STUDENT},
    {'email': 'user2@tek-up.de', 'password': '123456789', 'first_name': 'User', 'last_name': 'Two', 'role': STUDENT},
    {'email': 'admin@tek-up.de', 'password': 'admin123', 'first_name': 'Administrator', 'last_name': '', 'role': ADMIN},
]


class Command(BaseCommand):
    help = 'Create the demo accounts (user1, user2, admin @tek-up.de). Existing accounts are left unchanged.'

    def handle(self, *args, **options):
        for spec in DEMO_USERS:
            spec = dict(spec)
            role = spec.pop('role')
            if User.objects.filter(email=spec['email']).exists():
                self.stdout.write(f"exists   {spec['email']}")
                continue
            user = User.objects.create_user(**spec)
            user.groups.add(Group.objects.get(name=role))
            self.stdout.write(self.style.SUCCESS(f"created  {spec['email']} ({role})"))
