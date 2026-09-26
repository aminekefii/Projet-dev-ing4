import type { Role } from '../api'

export const homeFor = (role: Role): string => (role === 'admin' ? '/admin' : '/dashboard')
