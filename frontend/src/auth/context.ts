import { createContext } from 'react'
import type { PublicUser, SignupForm } from '../api'

export interface AuthValue {
  user: PublicUser | null
  ready: boolean
  login(email: string, password: string): Promise<PublicUser>
  register(form: SignupForm): Promise<PublicUser>
  logout(): Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
