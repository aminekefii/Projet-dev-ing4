from django.core.management.base import BaseCommand

from accounts.models import User
from courses.models import Certification, CourseSection, CourseVideo, Enrolment, VideoProgress

# (code, nom, fournisseur, catégorie, description) — même ordre que fixtures.ts
CERTS = [
    ('CCNA', 'CCNA — Networking Associate', 'Cisco', 'technical', 'Routing, switching, network fundamentals and security basics.'),
    ('CCNP', 'CCNP — Networking Professional', 'Cisco', 'technical', 'Enterprise networking, advanced routing and infrastructure.'),
    ('CCIE', 'CCIE — Networking Expert', 'Cisco', 'technical', 'Expert-level networking certification with hands-on lab exam.'),
    ('AWS-CLF', 'AWS Cloud Practitioner', 'Amazon AWS', 'technical', 'Foundational AWS Cloud concepts and services.'),
    ('AWS-SAA', 'AWS Solutions Architect — Associate', 'Amazon AWS', 'technical', 'Design distributed systems on AWS at associate level.'),
    ('AWS-SAP', 'AWS Solutions Architect — Professional', 'Amazon AWS', 'technical', 'Design and deploy large-scale, fault-tolerant systems on AWS.'),
    ('AWS-DVA', 'AWS Developer — Associate', 'Amazon AWS', 'technical', 'Develop, deploy and debug cloud-based applications on AWS.'),
    ('CEH', 'CEH — Certified Ethical Hacker', 'EC-Council', 'technical', 'Tools and methods of ethical hacking, real-world labs.'),
    ('CHFI', 'CHFI — Hacking Forensic Investigator', 'EC-Council', 'technical', 'Digital forensics, investigation and incident response.'),
    ('CND', 'CND — Certified Network Defender', 'EC-Council', 'technical', 'Defensive network security operations.'),
    ('RHCSA-EX200', 'RHCSA (EX-200)', 'Red Hat', 'technical', 'Red Hat Certified System Administrator.'),
    ('RHCE-EX294', 'RHCE (EX-294)', 'Red Hat', 'technical', 'Red Hat Certified Engineer with Ansible automation.'),
    ('RHCS-EX447', 'RHCS Ansible Best Practices (EX-447)', 'Red Hat', 'technical', 'Advanced Ansible automation with Red Hat.'),
    ('RHCS-EX358', 'RHCS Services Management (EX-358)', 'Red Hat', 'technical', 'Network services on Red Hat Enterprise Linux.'),
    ('eWPT', 'eWPT — Web Penetration Tester', 'INE', 'technical', 'Web application penetration testing certification.'),
    ('eCPPT', 'eCPPT — Professional Penetration Tester', 'INE', 'technical', 'Hands-on professional penetration tester certification.'),
    ('eMAPT', 'eMAPT — Mobile App Penetration Tester', 'INE', 'technical', 'Mobile application penetration testing.'),
    ('eSOC', 'eSOC — SOC Analyst', 'INE', 'technical', 'Security Operations Center analyst certification.'),
    ('HCIA', 'HCIA — ICT Associate', 'Huawei', 'technical', 'Huawei Certified ICT Associate.'),
    ('HCIP', 'HCIP — ICT Professional', 'Huawei', 'technical', 'Huawei Certified ICT Professional.'),
    ('HCIE', 'HCIE — ICT Expert', 'Huawei', 'technical', 'Huawei Certified ICT Expert.'),
    ('OCA-JAVA', 'Oracle Java — Associate (OCA)', 'Oracle', 'technical', 'Oracle Certified Associate in Java SE.'),
    ('OCP-JAVA', 'Oracle Java — Professional (OCP)', 'Oracle', 'technical', 'Oracle Certified Professional in Java SE.'),
    ('OCA-DB', 'Oracle Database — Associate', 'Oracle', 'technical', 'Oracle Database Administration at associate level.'),
    ('OCP-DB', 'Oracle Database — Professional', 'Oracle', 'technical', 'Oracle Database Administration at professional level.'),
    ('PCEP', 'PCEP — Entry-Level Python', 'Python Institute', 'technical', 'Entry-level Python programming certification.'),
    ('PCAP', 'PCAP — Associate Python Programmer', 'Python Institute', 'technical', 'Associate-level Python programming certification.'),
    ('PCPP', 'PCPP — Professional Python Programmer', 'Python Institute', 'technical', 'Professional-level Python programming certification.'),
    ('MS-ITS', 'Microsoft IT Specialist', 'Microsoft', 'technical', 'Foundational Microsoft IT Specialist track.'),
    ('AZ-900', 'Azure Fundamentals (AZ-900)', 'Microsoft', 'technical', 'Foundational knowledge of Microsoft Azure services.'),
    ('LFCS', 'LFCS — Linux Foundation Certified SysAdmin', 'Linux Foundation', 'technical', 'Linux Foundation Certified System Administrator.'),
    ('OSCP', 'OSCP — Penetration Tester', 'Offensive Security', 'technical', 'Hands-on offensive security certification.'),
    ('IELTS', 'IELTS — English Proficiency', 'British Council', 'linguistic', 'International English Language Testing System.'),
    ('GOETHE-B1', 'Goethe-Zertifikat B1 — German', 'Goethe-Institut', 'linguistic', 'German language certification at B1 level.'),
    ('DELF-B1', 'DELF B1 — French', 'France Éducation', 'linguistic', 'French language certification at B1 level.'),
    ('NSE-4', 'NSE 4 — Network Security Professional', 'Fortinet', 'other', 'Fortinet Network Security Professional certification.'),
    ('PECB-27001', 'ISO 27001 Lead Auditor', 'PECB', 'other', 'Information security management system lead auditor.'),
    ('VCP-DCV', 'VCP-DCV — Data Center Virtualization', 'VMware', 'other', 'VMware Certified Professional, Data Center Virtualization.'),
    ('NVIDIA-CUDA', 'CUDA Developer', 'NVIDIA', 'other', 'NVIDIA CUDA programming and parallel acceleration.'),
    ('ISTQB-FL', 'ISTQB Foundation Level', 'ISTQB', 'other', 'Software testing foundation certification.'),
]

MEDIA = {'PCEP': 'pcep', 'PCAP': 'pcap'}
FEATURED = {'PCEP', 'PCAP', 'AWS-CLF'}  # les 3 ouvertes à l'inscription

# (certif, titre de section, dossier, [(titre vidéo, nom de fichier, durée en s)])
COURSES = [
    ('PCEP', 'Getting started', '01-getting-started', [('Welcome to PCEP', '01-welcome', 312), ('Installing Python', '02-installing-python', 428)]),
    ('PCEP', 'Python basics', '02-python-basics', [('Variables and types', '01-variables', 655), ('Operators', '02-operators', 540)]),
    ('PCAP', 'Introduction', '01-introduction', [('Welcome to PCAP', '01-welcome', 295), ('Setting up your environment', '02-setup', 470)]),
    ('PCAP', 'Data types', '02-data-types', [('Numbers and strings', '01-numbers-strings', 720), ('Lists and tuples', '02-lists-tuples', 810)]),
    ('PCAP', 'Functions and modules', '03-functions', [('Defining functions', '01-functions', 760), ('Modules and packages', '02-modules', 690)]),
]


class Command(BaseCommand):
    help = 'Crée les certifications, les cours et les inscriptions de démo. Peut être relancée sans doublons.'

    def handle(self, *args, **options):
        # 1. Certifications
        for code, name, provider, category, description in CERTS:
            Certification.objects.update_or_create(code=code, defaults={
                'name': name, 'provider': provider, 'category': category, 'description': description,
                'media_path': MEDIA.get(code, ''), 'featured': code in FEATURED,
            })
        self.stdout.write(self.style.SUCCESS(f'{len(CERTS)} certifications'))

        # 2. Sections et vidéos
        positions = {}
        for code, title, folder, videos in COURSES:
            positions[code] = positions.get(code, 0) + 1
            section, _ = CourseSection.objects.update_or_create(
                certification=Certification.objects.get(code=code), position=positions[code],
                defaults={'title': title, 'folder': folder},
            )
            for i, (v_title, base, duration) in enumerate(videos, start=1):
                CourseVideo.objects.update_or_create(section=section, position=i, defaults={
                    'title': v_title, 'filename': f'{base}.mp4', 'subtitle_filename': f'{base}.vtt',
                    'duration_seconds': duration,
                })
        self.stdout.write(self.style.SUCCESS('Sections et vidéos PCEP / PCAP'))

        # 3. Inscriptions de démo : user1 a vu 2 vidéos PCAP, user2 les a toutes vues
        pcap = Certification.objects.get(code='PCAP')
        pcap_videos = list(CourseVideo.objects.filter(section__certification=pcap).order_by('section__position', 'position'))
        for email, watched in [('user1@tek-up.de', 2), ('user2@tek-up.de', len(pcap_videos))]:
            user = User.objects.filter(email=email).first()
            if user is None:
                self.stdout.write(f'{email} absent : lance d\'abord seed_demo_users')
                continue
            for video in pcap_videos[:watched]:
                VideoProgress.objects.get_or_create(user=user, video=video)
            Enrolment.objects.update_or_create(user=user, certification=pcap, defaults={
                'progress': round(100 * watched / len(pcap_videos)),
            })
            self.stdout.write(self.style.SUCCESS(f'{email} inscrit à PCAP ({watched}/{len(pcap_videos)} vidéos)'))