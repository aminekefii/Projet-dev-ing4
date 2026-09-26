import type { Certification, CourseSection, CourseVideo, DbState, NewsImage, Question, Choice } from './types'

export const DB_VERSION = 1

// 40 rows from tekup.sql lines 75-114, same order → ids 1..40.
const CERT_ROWS: [code: string, name: string, provider: string, category: Certification['category'], description: string][] = [
  ['CCNA', 'CCNA — Networking Associate', 'Cisco', 'technical', 'Routing, switching, network fundamentals and security basics.'],
  ['CCNP', 'CCNP — Networking Professional', 'Cisco', 'technical', 'Enterprise networking, advanced routing and infrastructure.'],
  ['CCIE', 'CCIE — Networking Expert', 'Cisco', 'technical', 'Expert-level networking certification with hands-on lab exam.'],
  ['AWS-CLF', 'AWS Cloud Practitioner', 'Amazon AWS', 'technical', 'Foundational AWS Cloud concepts and services.'],
  ['AWS-SAA', 'AWS Solutions Architect — Associate', 'Amazon AWS', 'technical', 'Design distributed systems on AWS at associate level.'],
  ['AWS-SAP', 'AWS Solutions Architect — Professional', 'Amazon AWS', 'technical', 'Design and deploy large-scale, fault-tolerant systems on AWS.'],
  ['AWS-DVA', 'AWS Developer — Associate', 'Amazon AWS', 'technical', 'Develop, deploy and debug cloud-based applications on AWS.'],
  ['CEH', 'CEH — Certified Ethical Hacker', 'EC-Council', 'technical', 'Tools and methods of ethical hacking, real-world labs.'],
  ['CHFI', 'CHFI — Hacking Forensic Investigator', 'EC-Council', 'technical', 'Digital forensics, investigation and incident response.'],
  ['CND', 'CND — Certified Network Defender', 'EC-Council', 'technical', 'Defensive network security operations.'],
  ['RHCSA-EX200', 'RHCSA (EX-200)', 'Red Hat', 'technical', 'Red Hat Certified System Administrator.'],
  ['RHCE-EX294', 'RHCE (EX-294)', 'Red Hat', 'technical', 'Red Hat Certified Engineer with Ansible automation.'],
  ['RHCS-EX447', 'RHCS Ansible Best Practices (EX-447)', 'Red Hat', 'technical', 'Advanced Ansible automation with Red Hat.'],
  ['RHCS-EX358', 'RHCS Services Management (EX-358)', 'Red Hat', 'technical', 'Network services on Red Hat Enterprise Linux.'],
  ['eWPT', 'eWPT — Web Penetration Tester', 'INE', 'technical', 'Web application penetration testing certification.'],
  ['eCPPT', 'eCPPT — Professional Penetration Tester', 'INE', 'technical', 'Hands-on professional penetration tester certification.'],
  ['eMAPT', 'eMAPT — Mobile App Penetration Tester', 'INE', 'technical', 'Mobile application penetration testing.'],
  ['eSOC', 'eSOC — SOC Analyst', 'INE', 'technical', 'Security Operations Center analyst certification.'],
  ['HCIA', 'HCIA — ICT Associate', 'Huawei', 'technical', 'Huawei Certified ICT Associate.'],
  ['HCIP', 'HCIP — ICT Professional', 'Huawei', 'technical', 'Huawei Certified ICT Professional.'],
  ['HCIE', 'HCIE — ICT Expert', 'Huawei', 'technical', 'Huawei Certified ICT Expert.'],
  ['OCA-JAVA', 'Oracle Java — Associate (OCA)', 'Oracle', 'technical', 'Oracle Certified Associate in Java SE.'],
  ['OCP-JAVA', 'Oracle Java — Professional (OCP)', 'Oracle', 'technical', 'Oracle Certified Professional in Java SE.'],
  ['OCA-DB', 'Oracle Database — Associate', 'Oracle', 'technical', 'Oracle Database Administration at associate level.'],
  ['OCP-DB', 'Oracle Database — Professional', 'Oracle', 'technical', 'Oracle Database Administration at professional level.'],
  ['PCEP', 'PCEP — Entry-Level Python', 'Python Institute', 'technical', 'Entry-level Python programming certification.'],
  ['PCAP', 'PCAP — Associate Python Programmer', 'Python Institute', 'technical', 'Associate-level Python programming certification.'],
  ['PCPP', 'PCPP — Professional Python Programmer', 'Python Institute', 'technical', 'Professional-level Python programming certification.'],
  ['MS-ITS', 'Microsoft IT Specialist', 'Microsoft', 'technical', 'Foundational Microsoft IT Specialist track.'],
  ['AZ-900', 'Azure Fundamentals (AZ-900)', 'Microsoft', 'technical', 'Foundational knowledge of Microsoft Azure services.'],
  ['LFCS', 'LFCS — Linux Foundation Certified SysAdmin', 'Linux Foundation', 'technical', 'Linux Foundation Certified System Administrator.'],
  ['OSCP', 'OSCP — Penetration Tester', 'Offensive Security', 'technical', 'Hands-on offensive security certification.'],
  ['IELTS', 'IELTS — English Proficiency', 'British Council', 'linguistic', 'International English Language Testing System.'],
  ['GOETHE-B1', 'Goethe-Zertifikat B1 — German', 'Goethe-Institut', 'linguistic', 'German language certification at B1 level.'],
  ['DELF-B1', 'DELF B1 — French', 'France Éducation', 'linguistic', 'French language certification at B1 level.'],
  ['NSE-4', 'NSE 4 — Network Security Professional', 'Fortinet', 'other', 'Fortinet Network Security Professional certification.'],
  ['PECB-27001', 'ISO 27001 Lead Auditor', 'PECB', 'other', 'Information security management system lead auditor.'],
  ['VCP-DCV', 'VCP-DCV — Data Center Virtualization', 'VMware', 'other', 'VMware Certified Professional, Data Center Virtualization.'],
  ['NVIDIA-CUDA', 'CUDA Developer', 'NVIDIA', 'other', 'NVIDIA CUDA programming and parallel acceleration.'],
  ['ISTQB-FL', 'ISTQB Foundation Level', 'ISTQB', 'other', 'Software testing foundation certification.'],
]

const MEDIA: Record<string, string> = { PCEP: 'pcep', PCAP: 'pcap' }

// [certCode, section title, folder, videos[title, file base, duration s]]
const COURSES: [string, string, string, [string, string, number][]][] = [
  ['PCEP', 'Getting started', '01-getting-started', [['Welcome to PCEP', '01-welcome', 312], ['Installing Python', '02-installing-python', 428]]],
  ['PCEP', 'Python basics', '02-python-basics', [['Variables and types', '01-variables', 655], ['Operators', '02-operators', 540]]],
  ['PCAP', 'Introduction', '01-introduction', [['Welcome to PCAP', '01-welcome', 295], ['Setting up your environment', '02-setup', 470]]],
  ['PCAP', 'Data types', '02-data-types', [['Numbers and strings', '01-numbers-strings', 720], ['Lists and tuples', '02-lists-tuples', 810]]],
  ['PCAP', 'Functions and modules', '03-functions', [['Defining functions', '01-functions', 760], ['Modules and packages', '02-modules', 690]]],
]

// Project/assets/images/news, sizes in bytes; newest first by index.
const NEWS_FILES: [string, number][] = [
  ['700124739_995522152822660_533561874467326606_n.jpg', 696606],
  ['699650890_995721799469362_1160164391028259687_n.jpg', 694653],
  ['699010975_995634766144732_1431707900303520702_n.jpg', 682347],
  ['697777723_994993622875513_1659045749949871843_n.jpg', 682163],
  ['697062056_994948136213395_1839914564616004790_n.jpg', 682953],
  ['696881521_995729302801945_3557291500901662285_n.jpg', 690620],
  ['696282146_994934239548118_4800355187093740467_n.jpg', 687169],
  ['696126321_995625282812347_2742271832016498348_n.jpg', 690891],
]

const q = (question: string, a: string, b: string, c: string, d: string, answer: Choice): Question =>
  ({ question, choices: { A: a, B: b, C: c, D: d }, answer })

/** INV §3, verbatim. Keyed by certification code. */
export const QUESTION_BANKS: Record<string, Question[]> = {
  PCAP: [
    q('What is the correct way to print "Hello" in Python?', 'echo("Hello")', 'print("Hello")', 'printf("Hello")', 'show("Hello")', 'B'),
    q('Which symbol is used for comments in Python?', '//', '<!-- -->', '#', '**', 'C'),
    q('What is the result of 2 + 3 in Python?', '5', '23', '6', 'Error', 'A'),
    q('Which data type is used for text in Python?', 'int', 'float', 'str', 'bool', 'C'),
    q('Which keyword is used to create a function in Python?', 'func', 'define', 'function', 'def', 'D'),
  ],
}

const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString()

export function seed(): DbState {
  const certifications: Certification[] = CERT_ROWS.map(([code, name, provider, category, description], i) => ({
    id: i + 1, code, name, provider, category, description, mediaPath: MEDIA[code] ?? null,
  }))
  const certId = (code: string): number => certifications.find(c => c.code === code)!.id

  const courseSections: CourseSection[] = []
  const courseVideos: CourseVideo[] = []
  const positionByCert: Record<string, number> = {}
  for (const [code, title, folder, videos] of COURSES) {
    const position = (positionByCert[code] = (positionByCert[code] ?? 0) + 1)
    const section: CourseSection = { id: courseSections.length + 1, certificationId: certId(code), position, title, folder }
    courseSections.push(section)
    videos.forEach(([vTitle, base, duration], i) => {
      courseVideos.push({
        id: courseVideos.length + 1, sectionId: section.id, position: i + 1, title: vTitle,
        filename: `${base}.mp4`, subtitleFilename: `${base}.vtt`, durationSeconds: duration,
      })
    })
  }
  const pcapVideoIds = courseVideos
    .filter(v => courseSections.find(s => s.id === v.sectionId)!.certificationId === certId('PCAP'))
    .map(v => v.id)

  const news: NewsImage[] = NEWS_FILES.map(([name, sizeBytes], i) => ({
    id: i + 1, name, url: `/assets/images/news/${encodeURIComponent(name)}`, sizeBytes, uploadedAt: daysAgo(i * 3 + 1),
  }))

  return {
    version: DB_VERSION,
    sessionUserId: null,
    tables: {
      users: [
        { id: 1, email: 'user1@tek-up.de', password: '123456789', firstname: 'User', lastname: 'One', role: 'student', createdAt: daysAgo(120) },
        { id: 2, email: 'user2@tek-up.de', password: '123456789', firstname: 'User', lastname: 'Two', role: 'student', createdAt: daysAgo(90) },
        { id: 3, email: 'admin@tek-up.de', password: 'admin123', firstname: 'Administrator', lastname: null, role: 'admin', createdAt: daysAgo(200) },
      ],
      profiles: [
        { userId: 1, phone: null, address: null, photo: null, updatedAt: daysAgo(120) },
        { userId: 2, phone: null, address: null, photo: null, updatedAt: daysAgo(90) },
      ],
      certifications,
      userCertifications: [
        { id: 1, userId: 1, certificationId: certId('PCAP'), status: 'in_progress', progress: 33, enrolledAt: daysAgo(10), earnedAt: null },
        { id: 2, userId: 2, certificationId: certId('PCAP'), status: 'in_progress', progress: 100, enrolledAt: daysAgo(30), earnedAt: null },
      ],
      courseSections,
      courseVideos,
      videoProgress: [
        ...pcapVideoIds.slice(0, 2).map(videoId => ({ userId: 1, videoId, watchedAt: daysAgo(5) })),
        ...pcapVideoIds.map(videoId => ({ userId: 2, videoId, watchedAt: daysAgo(3) })),
      ],
      voucherRequests: [],
      contactMessages: [
        { id: 1, name: 'Sarra', surname: 'Ben Ali', email: 'sarra.benali@example.com', message: 'Hello,\nI would like to know when the next PCAP exam session is planned.\nThank you.', status: 'unread', submittedAt: daysAgo(2) },
      ],
      news,
      whiteTests: [],
    },
  }
}
