from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

STUDENT = 'student'
ADMIN = 'admin'


class UserManager(BaseUserManager):
    """Users sign in with their email; there is no username."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError('An email address is required.')
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault('is_staff', False)
        extra.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra['is_staff'] = True
        extra['is_superuser'] = True
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField('email address', unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    @property
    def role(self):
        """'admin' for superusers and members of the admin group, otherwise 'student'."""
        if self.is_superuser or self.groups.filter(name=ADMIN).exists():
            return ADMIN
        return STUDENT

    def __str__(self):
        return self.email
