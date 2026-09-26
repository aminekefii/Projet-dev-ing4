import { createContext } from 'react'
import type { PublicUser } from '../api'

export interface AuthValue {
  user: PublicUser | null
  ready: boolean
  login(email: string, password: string): Promise<PublicUser>
  logout(): Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
