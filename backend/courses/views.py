from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import STUDENT

from .models import Certification, CourseVideo, Enrolment, VideoProgress

WATCHED_RATIO = 0.9  # une vidéo compte comme vue à partir de 90 %

GROUP_LABELS = {
    'technical': 'Technical Certifications',
    'linguistic': 'Linguistic Certifications',
    'other': 'Other Certifications',
}
CATEGORY_ORDER = {'technical': 0, 'linguistic': 1, 'other': 2}


# ---------- Outils ----------

class IsStudent(BasePermission):
    """Seuls les étudiants connectés accèdent à ces pages (comme requireRole('student') côté front)."""

    message = 'You do not have access to this page.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == STUDENT


def ordered_certifications():
    """Même ordre que le front : catégorie, puis PCEP et PCAP en premier, puis fournisseur et code."""
    def key(c):
        pin = {'PCEP': 0, 'PCAP': 1}.get(c.code, 2)
        return (CATEGORY_ORDER[c.category], pin, c.provider.lower(), c.code.lower())
    return sorted(Certification.objects.all(), key=key)


def cert_json(c):
    """Même forme que l'interface Certification de frontend/src/api/types.ts."""
    return {
        'id': c.id, 'code': c.code, 'name': c.name, 'provider': c.provider,
        'category': c.category, 'description': c.description or None, 'mediaPath': c.media_path or None,
    }


def course_videos(cert):
    """Toutes les vidéos d'une certification, dans l'ordre du cours."""
    return list(CourseVideo.objects.filter(section__certification=cert).order_by('section__position', 'position'))


def recompute_progress(enrolment):
    """progress = arrondi(100 x vidéos vues / total), 0 s'il n'y a pas de vidéo. Enregistre le résultat."""
    videos = course_videos(enrolment.certification)
    watched = VideoProgress.objects.filter(user=enrolment.user, video__in=videos).count()
    enrolment.progress = round(100 * watched / len(videos)) if videos else 0
    enrolment.save(update_fields=['progress'])
    return enrolment.progress


def flash(kind, message, code=status.HTTP_200_OK):
    return Response({'type': kind, 'message': message}, status=code)


def error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'detail': message}, status=code)


# ---------- Catalogue et inscriptions ----------

class CatalogView(APIView):
    """GET /api/certifications/catalog/ : les certifications groupées par catégorie."""

    permission_classes = [IsStudent]

    def get(self, request):
        enrolled = set(request.user.enrolments.values_list('certification_id', flat=True))
        groups = {cat: {'category': cat, 'label': label, 'items': []} for cat, label in GROUP_LABELS.items()}
        for c in ordered_certifications():
            groups[c.category]['items'].append({**cert_json(c), 'enrolled': c.id in enrolled, 'featured': c.featured})
        return Response([g for g in groups.values() if g['items']])


class EnrollView(APIView):
    """POST /api/certifications/<id>/enroll/ avec {password}. Mêmes vérifications, dans le même ordre, que la v1."""

    permission_classes = [IsStudent]

    def post(self, request, cert_id):
        cert = Certification.objects.filter(pk=cert_id).first()
        if cert is None:
            return error('That certification could not be found.')
        if not cert.featured:
            return error('That certification is not currently open for enrolment.')
        password = request.data.get('password') or ''
        if password == '':
            return error('Please enter your password to confirm the enrolment.')
        if not request.user.check_password(password):
            return error('Wrong password. Enrolment cancelled.')
        _, created = Enrolment.objects.get_or_create(user=request.user, certification=cert)
        if not created:
            return flash('info', 'You are already enrolled in that certification.')
        return flash('success', 'Enrolled successfully. The certification is now in progress on your dashboard.',
                     status.HTTP_201_CREATED)


class MyCertificationsView(APIView):
    """GET /api/certifications/mine/?filter=all|earned|in_progress"""

    permission_classes = [IsStudent]

    def get(self, request):
        wanted = request.query_params.get('filter', 'all')
        enrolments = sorted(
            request.user.enrolments.select_related('certification'),
            key=lambda e: e.enrolled_at, reverse=True,
        )
        enrolments.sort(key=lambda e: e.status != 'earned')  # obtenues d'abord (tri stable)
        items = [{
            'certification': cert_json(e.certification), 'status': e.status, 'progress': e.progress,
            'enrolledAt': e.enrolled_at, 'earnedAt': e.earned_at,
        } for e in enrolments]
        earned = sum(1 for i in items if i['status'] == 'earned')
        catalog_size = Certification.objects.count()
        return Response({
            'items': items if wanted == 'all' else [i for i in items if i['status'] == wanted],
            'total': len(items),
            'earned': earned,
            'inProgress': len(items) - earned,
            'catalogSize': catalog_size,
            'available': max(0, catalog_size - len(items)),
        })


class CancelView(APIView):
    """POST /api/certifications/<id>/cancel/ : seules les inscriptions en cours s'annulent."""

    permission_classes = [IsStudent]

    def post(self, request, cert_id):
        deleted, _ = Enrolment.objects.filter(
            user=request.user, certification_id=cert_id, status='in_progress').delete()
        if not deleted:
            return error('That enrolment could not be cancelled.')
        return flash('success', 'Enrolment cancelled.')


# ---------- Cours et progression ----------

class CourseView(APIView):
    """GET /api/courses/<id>/ : sections, vidéos et progression. 404 inconnue, 403 pas inscrit."""

    permission_classes = [IsStudent]

    def get(self, request, cert_id):
        cert = Certification.objects.filter(pk=cert_id).first()
        if cert is None:
            return error('Certification not found.', status.HTTP_404_NOT_FOUND)
        enrolment = Enrolment.objects.filter(user=request.user, certification=cert).first()
        if enrolment is None:
            return error('You are not enrolled in this certification.', status.HTTP_403_FORBIDDEN)

        watched = set(request.user.watched_videos.values_list('video_id', flat=True))
        sections = []
        for s in cert.sections.prefetch_related('videos'):
            videos = [{
                'id': v.id, 'sectionId': s.id, 'title': v.title, 'durationSeconds': v.duration_seconds,
                'watched': v.id in watched,
                # Les fichiers passent par Django, qui vérifie l'inscription (vidéos protégées).
                'videoUrl': f'/api/courses/videos/{v.id}/stream/',
                'subtitleUrl': f'/api/courses/videos/{v.id}/subtitles/' if v.subtitle_filename else None,
            } for v in s.videos.all()]
            sections.append({
                'id': s.id, 'position': s.position, 'title': s.title,
                'total': len(videos), 'watched': sum(v['watched'] for v in videos), 'videos': videos,
            })

        ordered = course_videos(cert)
        first_unwatched = next((v for v in ordered if v.id not in watched), None)
        initial = first_unwatched or (ordered[-1] if ordered else None)
        return Response({
            'certification': cert_json(cert),
            'progress': enrolment.progress,
            'hasContent': bool(cert.media_path),
            'sections': sections,
            'initialVideoId': initial.id if initial else None,
        })


class MarkWatchedView(APIView):
    """POST /api/courses/videos/<id>/watched/ avec {position, duration} en secondes.

    Le serveur vérifie lui-même la règle des 90 % : on ne peut plus valider une vidéo
    juste en appelant l'API sans l'avoir regardée (la v1 le permettait).
    """

    permission_classes = [IsStudent]

    def post(self, request, video_id):
        video = CourseVideo.objects.select_related('section__certification').filter(pk=video_id).first()
        if video is None:
            return error('video_not_found', status.HTTP_404_NOT_FOUND)
        cert = video.section.certification
        enrolment = Enrolment.objects.filter(user=request.user, certification=cert).first()
        if enrolment is None:
            return error('not_enrolled', status.HTTP_403_FORBIDDEN)

        try:
            position = float(request.data.get('position'))
            duration = float(video.duration_seconds or request.data.get('duration'))
        except (TypeError, ValueError):
            return error('position_required')
        if duration <= 0 or position < WATCHED_RATIO * duration:
            return error('not_watched_enough')

        VideoProgress.objects.get_or_create(user=request.user, video=video)
        progress = recompute_progress(enrolment)
        section_videos = list(video.section.videos.values_list('id', flat=True))
        return Response({
            'progress': progress,
            'section': {
                'id': video.section.id,
                'total': len(section_videos),
                'watched': request.user.watched_videos.filter(video_id__in=section_videos).count(),
            },
        })


# ---------- Fichiers protégés ----------

def protected_file(request, video_id, kind):
    """GET /api/courses/videos/<id>/stream/ et /subtitles/ : le fichier, seulement pour les inscrits.

    En dev, Django envoie le fichier lui-même. Sous Docker (COURSE_MEDIA_ACCEL = True),
    Django vérifie seulement les droits et Nginx envoie le fichier via X-Accel-Redirect.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Please sign in to continue.'}, status=403)
    video = get_object_or_404(CourseVideo.objects.select_related('section__certification'), pk=video_id)
    cert = video.section.certification
    if not Enrolment.objects.filter(user=request.user, certification=cert).exists():
        return JsonResponse({'detail': 'You are not enrolled in this certification.'}, status=403)

    filename = video.filename if kind == 'video' else video.subtitle_filename
    if not filename or not cert.media_path:
        raise Http404
    relative = f'{cert.media_path}/{video.section.folder}/{filename}'
    root = Path(settings.COURSE_MEDIA_ROOT).resolve()
    path = (root / relative).resolve()
    if root not in path.parents or not path.is_file():  # pas de ../ pour sortir du dossier
        raise Http404

    content_type = 'video/mp4' if kind == 'video' else 'text/vtt'
    if settings.COURSE_MEDIA_ACCEL:
        response = HttpResponse(content_type=content_type)
        response['X-Accel-Redirect'] = f'/protected-media/{relative}'
        return response
    return FileResponse(open(path, 'rb'), content_type=content_type)
