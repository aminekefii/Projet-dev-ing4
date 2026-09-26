export type Role = 'student' | 'admin'
export type Category = 'technical' | 'linguistic' | 'other'
export type EnrolmentStatus = 'in_progress' | 'earned'
export type VoucherStatus = 'pending' | 'approved' | 'rejected'
export type MessageStatus = 'unread' | 'read'
export type Choice = 'A' | 'B' | 'C' | 'D'

export interface User {
  id: number
  email: string
  password: string // mock only, plain text like v1
  firstname: string | null
  lastname: string | null
  role: Role
  createdAt: string // ISO
}
export type PublicUser = Omit<User, 'password'>

export interface Profile {
  userId: number
  phone: string | null
  address: string | null
  photo: string | null // data URL
  updatedAt: string
}

export interface Certification {
  id: number
  code: string
  name: string
  provider: string
  category: Category
  description: string | null
  mediaPath: string | null
}

export interface UserCertification {
  id: number
  userId: number
  certificationId: number
  status: EnrolmentStatus
  progress: number // 0..100
  enrolledAt: string
  earnedAt: string | null
}

export interface CourseSection {
  id: number
  certificationId: number
  position: number
  title: string
  folder: string
}

export interface CourseVideo {
  id: number
  sectionId: number
  position: number
  title: string
  filename: string
  subtitleFilename: string | null
  durationSeconds: number | null
}

export interface VideoProgress {
  userId: number
  videoId: number
  watchedAt: string
}

export interface VoucherRequest {
  id: number
  userId: number
  certificationId: number
  status: VoucherStatus
  requestedAt: string
}

export interface ContactMessage {
  id: number
  name: string
  surname: string
  email: string
  message: string
  status: MessageStatus
  submittedAt: string
}

export interface NewsImage {
  id: number
  name: string
  url: string // /assets/images/news/... or a data URL
  sizeBytes: number
  uploadedAt: string
}

export interface Question {
  question: string
  choices: Record<Choice, string>
  answer: Choice
}

export interface WhiteTestState {
  userId: number
  certId: number
  certCode: string
  startedAt: number // epoch ms
  currentQ: number // 0-based
  answers: (Choice | null)[]
  submitted: boolean
}

export interface Tables {
  users: User[]
  profiles: Profile[]
  certifications: Certification[]
  userCertifications: UserCertification[]
  courseSections: CourseSection[]
  courseVideos: CourseVideo[]
  videoProgress: VideoProgress[]
  voucherRequests: VoucherRequest[]
  contactMessages: ContactMessage[]
  news: NewsImage[]
  whiteTests: WhiteTestState[]
}
export type TableName = keyof Tables

export interface DbState {
  version: number
  sessionUserId: number | null
  tables: Tables
}
