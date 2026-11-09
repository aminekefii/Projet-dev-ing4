from django.conf import settings
from django.db import models


class Certification(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.code


class Enrollment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    certification = models.ForeignKey(Certification, on_delete=models.CASCADE)
    progress = models.PositiveSmallIntegerField(default=0)  # 0 à 100

    class Meta:
        unique_together = ("user", "certification")