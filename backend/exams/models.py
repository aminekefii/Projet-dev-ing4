from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class Question(models.Model):
    certification = models.ForeignKey(
        "catalog.Certification", on_delete=models.CASCADE, related_name="questions"
    )
    text = models.TextField()
    choice_a = models.CharField(max_length=300)
    choice_b = models.CharField(max_length=300)
    choice_c = models.CharField(max_length=300)
    choice_d = models.CharField(max_length=300)
    correct_choice = models.CharField(max_length=1, choices=[(c, c) for c in "ABCD"])
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.text[:60]


class WhiteTest(models.Model):
    """Une tentative de test d'un étudiant."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="white_tests")
    certification = models.ForeignKey("catalog.Certification", on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.PositiveSmallIntegerField(null=True, blank=True)  # en %
    passed = models.BooleanField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            # une seule tentative en cours par étudiant et par certification
            models.UniqueConstraint(
                fields=["user", "certification"],
                condition=models.Q(submitted_at__isnull=True),
                name="one_open_test_per_cert",
            )
        ]


class WhiteTestAnswer(models.Model):
    """La réponse de l'étudiant à une question de sa tentative."""
    test = models.ForeignKey(WhiteTest, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    selected = models.CharField(max_length=1, blank=True)  # "" = pas répondu

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["test", "question"], name="uniq_answer_per_question"
            )
        ]