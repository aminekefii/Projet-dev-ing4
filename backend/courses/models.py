from django.conf import settings
from django.db import models


class Certification(models.Model):
    CATEGORIES = [('technical', 'Technical'), ('linguistic', 'Linguistic'), ('other', 'Other')]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    provider = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    description = models.TextField(blank=True)
    media_path = models.CharField(max_length=100, blank=True)
    featured = models.BooleanField(default=False)

    def __str__(self):
        return self.code


class CourseSection(models.Model):
    certification = models.ForeignKey(Certification, on_delete=models.CASCADE, related_name='sections')
    position = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)
    folder = models.CharField(max_length=100)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f'{self.certification.code} - {self.title}'


class CourseVideo(models.Model):
    section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='videos')
    position = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)
    filename = models.CharField(max_length=200)
    subtitle_filename = models.CharField(max_length=200, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return self.title


class Enrolment(models.Model):
    STATUSES = [('in_progress', 'In progress'), ('earned', 'Earned')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrolments')
    certification = models.ForeignKey(Certification, on_delete=models.CASCADE, related_name='enrolments')
    status = models.CharField(max_length=20, choices=STATUSES, default='in_progress')
    progress = models.PositiveSmallIntegerField(default=0)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    earned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'certification')

    def __str__(self):
        return f'{self.user} - {self.certification.code}'


class VideoProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watched_videos')
    video = models.ForeignKey(CourseVideo, on_delete=models.CASCADE, related_name='views')
    watched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')

    def __str__(self):
        return f'{self.user} - {self.video}'