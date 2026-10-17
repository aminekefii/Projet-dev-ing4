import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, type PublicUser, type SignupForm } from '../api'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    // Always become ready, even if reading the session fails (treated as logged out).
    auth.currentUser()
      .then(u => { if (alive) setUser(u) })
      .catch(() => { if (alive) setUser(null) })
      .finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login(email, password)
    setUser(u)
    return u
  }, [])
  const register = useCallback(async (form: SignupForm) => {
    const u = await auth.register(form)
    setUser(u)
    return u
  }, [])
  const logout = useCallback(async () => {
    try {
      await auth.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
