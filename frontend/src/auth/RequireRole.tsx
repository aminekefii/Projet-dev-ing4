import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../api'
import { homeFor } from './homeFor'
import { useAuth } from './useAuth'

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}
